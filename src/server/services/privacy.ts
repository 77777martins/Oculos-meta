import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { audit } from "./audit";

/**
 * LGPD — direito de acesso (art. 18, II): exporta os dados pessoais do titular.
 * Não inclui hashes de senha, tokens ou dados internos de segurança.
 */
export async function exportUserData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      lastLoginAt: true,
      addresses: { where: { deletedAt: null }, omit: { userId: true } },
      favorites: { select: { createdAt: true, product: { select: { name: true, slug: true } } } },
      consents: { select: { type: true, version: true, granted: true, createdAt: true } },
      orders: {
        select: {
          number: true,
          status: true,
          totalCents: true,
          createdAt: true,
          shippingAddress: true,
          customerDocument: true,
          items: { select: { productName: true, variantName: true, quantity: true, unitPriceCents: true } },
          payments: { select: { method: true, status: true, amountCents: true, createdAt: true } },
        },
      },
      dataRequests: { select: { type: true, status: true, createdAt: true, completedAt: true } },
    },
  });
  await db.dataRequest.create({ data: { userId, type: "ACCESS", status: "COMPLETED", completedAt: new Date(), notes: "Exportação automática pelo titular" } });
  return { generatedAt: new Date().toISOString(), controller: "Óculos Meta Store", data: user };
}

/**
 * LGPD — eliminação (art. 18, VI). Os dados de pedidos são retidos pelo prazo
 * legal fiscal (art. 16, I — cumprimento de obrigação legal), mas a conta é
 * anonimizada: nome, e-mail, telefone, endereços, favoritos e sessões são removidos.
 */
export async function deleteAccount(userId: string, ip: string): Promise<void> {
  const active = await db.order.count({ where: { userId, status: { in: ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED"] } } });
  if (active > 0) throw new ConflictError("Você possui pedidos em andamento. A exclusão poderá ser feita após a conclusão deles.", "ACTIVE_ORDERS");

  const anonymousEmail = `removido+${randomUUID()}@anonimo.invalid`;
  const unusablePassword = await hashPassword(randomUUID() + randomUUID());

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name: "Titular removido", email: anonymousEmail, phone: null, passwordHash: unusablePassword, anonymizedAt: new Date(), role: "CUSTOMER" },
    });
    await tx.address.deleteMany({ where: { userId } });
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    // Pedidos finalizados: mantém dados fiscais mínimos e remove contato/endereço completo.
    await tx.order.updateMany({ where: { userId }, data: { customerName: "Titular removido", customerEmail: anonymousEmail, customerPhone: null } });
    await tx.dataRequest.create({ data: { userId, type: "DELETION", status: "COMPLETED", completedAt: new Date(), notes: "Conta anonimizada pelo titular" } });
    await audit({ actorId: userId, action: "privacy.account_deleted", entityType: "User", entityId: userId, ip }, tx);
  });
  await revokeAllUserSessions(userId);
}
