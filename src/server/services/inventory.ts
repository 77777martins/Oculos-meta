import "server-only";
import { Prisma } from "@prisma/client";
import type { Tx } from "@/lib/db";
import { ConflictError } from "@/lib/errors";

/**
 * Operações de estoque. TODAS usam UPDATE condicional atômico — a condição
 * no WHERE garante que duas compras simultâneas nunca vendam a mesma unidade
 * (sem necessidade de lock explícito). As CHECK constraints do banco são a
 * segunda barreira.
 */

export interface StockLine {
  variantId: string;
  quantity: number;
  label?: string;
}

/** Ordena por ID para que transações concorrentes travem linhas na mesma ordem (evita deadlock). */
const sorted = (lines: StockLine[]) => [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));

export async function reserveStock(tx: Tx, lines: StockLine[], orderId: string): Promise<void> {
  for (const line of sorted(lines)) {
    const updated = await tx.$executeRaw`
      UPDATE "ProductVariant" SET "reserved" = "reserved" + ${line.quantity}, "updatedAt" = now()
      WHERE "id" = ${line.variantId} AND "isActive" = true AND "stock" - "reserved" >= ${line.quantity}`;
    if (updated !== 1) {
      throw new ConflictError(`Estoque insuficiente para ${line.label ?? "um dos itens"}. Atualize o carrinho.`, "OUT_OF_STOCK", {
        variantId: line.variantId,
      });
    }
  }
  await tx.inventoryMovement.createMany({
    data: lines.map((l) => ({ variantId: l.variantId, type: "RESERVE" as const, quantity: l.quantity, orderId, reason: "Reserva de checkout" })),
  });
}

export async function releaseReservation(tx: Tx, lines: StockLine[], orderId: string, reason: string): Promise<void> {
  for (const line of sorted(lines)) {
    // GREATEST evita violar a constraint caso a reserva já tenha sido liberada por outro fluxo.
    await tx.$executeRaw`
      UPDATE "ProductVariant" SET "reserved" = GREATEST("reserved" - ${line.quantity}, 0), "updatedAt" = now()
      WHERE "id" = ${line.variantId}`;
  }
  await tx.inventoryMovement.createMany({
    data: lines.map((l) => ({ variantId: l.variantId, type: "RELEASE" as const, quantity: -l.quantity, orderId, reason })),
  });
}

/** Pagamento confirmado: a reserva vira baixa definitiva de estoque. */
export async function commitReservedSale(tx: Tx, lines: StockLine[], orderId: string): Promise<void> {
  for (const line of sorted(lines)) {
    const updated = await tx.$executeRaw`
      UPDATE "ProductVariant" SET "stock" = "stock" - ${line.quantity}, "reserved" = "reserved" - ${line.quantity}, "updatedAt" = now()
      WHERE "id" = ${line.variantId} AND "reserved" >= ${line.quantity} AND "stock" >= ${line.quantity}`;
    if (updated !== 1) throw new ConflictError("Inconsistência de reserva de estoque.", "RESERVATION_MISMATCH", { variantId: line.variantId });
  }
  await tx.inventoryMovement.createMany({
    data: lines.map((l) => ({ variantId: l.variantId, type: "SALE" as const, quantity: -l.quantity, orderId, reason: "Pagamento aprovado" })),
  });
}

/**
 * Pagamento aprovado DEPOIS da reserva ter expirado: tenta baixar direto do
 * disponível. Retorna false (sem alterar nada) se faltar estoque — o pedido exigirá reembolso.
 */
export async function tryDirectSale(tx: Tx, lines: StockLine[], orderId: string): Promise<boolean> {
  const ordered = sorted(lines);
  if (ordered.length === 0) return true;
  // 1) trava TODAS as linhas e verifica antes de alterar qualquer uma:
  //    garante "tudo ou nada" mesmo sem rollback da transação chamadora.
  const rows = await tx.$queryRaw<Array<{ id: string; stock: number; reserved: number }>>`
    SELECT "id", "stock", "reserved" FROM "ProductVariant"
    WHERE "id" IN (${Prisma.join(ordered.map((l) => l.variantId))})
    ORDER BY "id" FOR UPDATE`;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const enough = ordered.every((l) => {
    const r = byId.get(l.variantId);
    return r !== undefined && r.stock - r.reserved >= l.quantity;
  });
  if (!enough) return false;

  // 2) com as linhas travadas, as baixas abaixo não podem falhar por concorrência.
  for (const line of ordered) {
    await tx.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" - ${line.quantity}, "updatedAt" = now() WHERE "id" = ${line.variantId}`;
  }
  await tx.inventoryMovement.createMany({
    data: lines.map((l) => ({ variantId: l.variantId, type: "SALE" as const, quantity: -l.quantity, orderId, reason: "Pagamento aprovado após expiração" })),
  });
  return true;
}

export async function returnToStock(tx: Tx, lines: StockLine[], orderId: string, reason: string, actorId?: string): Promise<void> {
  for (const line of sorted(lines)) {
    await tx.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" + ${line.quantity}, "updatedAt" = now() WHERE "id" = ${line.variantId}`;
  }
  await tx.inventoryMovement.createMany({
    data: lines.map((l) => ({ variantId: l.variantId, type: "RETURN" as const, quantity: l.quantity, orderId, reason, actorId })),
  });
}

/** Ajuste manual pelo painel (entrada de mercadoria, perda, inventário). */
export async function adjustStock(tx: Tx, variantId: string, delta: number, reason: string, actorId: string): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ stock: number }>>`
    UPDATE "ProductVariant" SET "stock" = "stock" + ${delta}, "updatedAt" = now()
    WHERE "id" = ${variantId} AND "stock" + ${delta} >= "reserved"
    RETURNING "stock"`;
  if (rows.length !== 1) throw new ConflictError("Ajuste inválido: o estoque não pode ficar abaixo das unidades reservadas.", "INVALID_ADJUSTMENT");
  await tx.inventoryMovement.create({
    data: { variantId, type: delta > 0 ? "RESTOCK" : "ADJUSTMENT", quantity: delta, reason, actorId },
  });
  return rows[0]!.stock;
}
