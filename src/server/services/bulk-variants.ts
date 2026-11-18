import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type { bulkVariantUpdateSchema } from "@/lib/validation/catalog";
import { audit } from "./audit";
import { adjustStock } from "./inventory";

type Input = z.infer<typeof bulkVariantUpdateSchema>;

/**
 * Atualiza preço e estoque de várias variantes de uma vez, numa única transação
 * (tudo ou nada). Estoque nunca é sobrescrito: a diferença vira um movimento no
 * livro-razão, e o banco recusa ficar abaixo das unidades reservadas.
 */
export async function bulkUpdateVariants(input: Input, actorId: string, ip: string): Promise<{ changed: number }> {
  const ids = input.items.map((i) => i.variantId);
  return db.$transaction(async (tx) => {
    const current = await tx.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true, sku: true, priceCents: true, salePriceCents: true, stock: true, isActive: true } });
    if (current.length !== new Set(ids).size) throw new NotFoundError("Uma ou mais variantes não existem mais. Recarregue a página.");
    const byId = new Map(current.map((v) => [v.id, v]));
    let changed = 0;
    for (const item of input.items) {
      const before = byId.get(item.variantId)!;
      const priceChanged = before.priceCents !== item.priceCents || before.salePriceCents !== item.salePriceCents;
      const activeChanged = before.isActive !== item.isActive;
      const delta = item.stock - before.stock;
      if (!priceChanged && !activeChanged && delta === 0) continue;
      changed++;
      if (priceChanged || activeChanged) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { priceCents: item.priceCents, salePriceCents: item.salePriceCents, isActive: item.isActive } });
      }
      if (delta !== 0) await adjustStock(tx, item.variantId, delta, input.reason, actorId);
      await audit(
        {
          actorId,
          action: "variant.bulk_update",
          entityType: "ProductVariant",
          entityId: item.variantId,
          metadata: { sku: before.sku, priceCents: [before.priceCents, item.priceCents], salePriceCents: [before.salePriceCents, item.salePriceCents], isActive: [before.isActive, item.isActive], stockDelta: delta, reason: input.reason },
          ip,
        },
        tx,
      );
    }
    return { changed };
  });
}
