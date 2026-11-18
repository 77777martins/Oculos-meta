import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Política de retenção (LGPD — art. 15/16: término do tratamento e minimização).
 * Prazos centralizados aqui e documentados em docs/SEGURANCA.md e na Política de Privacidade.
 */
export const RETENTION = {
  /** Tokens de redefinição de senha usados/expirados. */
  resetTokensDays: 7,
  /** Mensagens do formulário de contato. */
  contactMessagesDays: 730,
  /** Logs de auditoria (segurança e prova de ações administrativas). */
  auditLogsDays: 1825,
  /** Pedidos que NUNCA foram pagos: dados pessoais anonimizados após este prazo. */
  unpaidOrdersDays: 180,
} as const;

export const REDACTED_NAME = "Dados removidos (retenção)";
const REDACTED_ADDRESS: Prisma.InputJsonValue = { recipient: "removido", zipCode: "", street: "", number: "", complement: null, district: "", city: "", state: "", phone: null };

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

export async function applyRetentionPolicy() {
  const [resetTokens, contactMessages, auditLogs, unpaidOrders] = await Promise.all([
    db.passwordResetToken.deleteMany({
      where: { OR: [{ usedAt: { lt: daysAgo(RETENTION.resetTokensDays) } }, { expiresAt: { lt: daysAgo(RETENTION.resetTokensDays) } }] },
    }),
    db.contactMessage.deleteMany({ where: { createdAt: { lt: daysAgo(RETENTION.contactMessagesDays) } } }),
    db.auditLog.deleteMany({ where: { createdAt: { lt: daysAgo(RETENTION.auditLogsDays) } } }),
    // Sem venda não há obrigação fiscal: mantém o pedido para estatística, remove quem comprou.
    db.order.updateMany({
      where: {
        status: { in: ["EXPIRED", "CANCELLED"] },
        createdAt: { lt: daysAgo(RETENTION.unpaidOrdersDays) },
        customerName: { not: REDACTED_NAME },
        payments: { none: { status: { in: ["APPROVED", "REFUNDED", "CHARGED_BACK"] } } },
      },
      data: { customerName: REDACTED_NAME, customerEmail: "removido@anonimo.invalid", customerDocument: "", customerPhone: null, shippingAddress: REDACTED_ADDRESS, notes: null },
    }),
  ]);
  const result = { resetTokens: resetTokens.count, contactMessages: contactMessages.count, auditLogs: auditLogs.count, unpaidOrders: unpaidOrders.count };
  if (Object.values(result).some((n) => n > 0)) logger.info("retention.applied", result);
  return result;
}
