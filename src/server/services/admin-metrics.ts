import "server-only";
import { db } from "@/lib/db";

const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
export const LOW_STOCK_THRESHOLD = 3;

/** Dia (YYYY-MM-DD) no fuso de Brasília. */
function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

export async function getDashboardMetrics() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const since60 = new Date(now.getTime() - 60 * 86_400_000);

  const [paid30, paidPrev, pendingCount, customers, newCustomers, lowStock, recentOrders, alerts, unread] = await Promise.all([
    db.order.findMany({ where: { status: { in: [...PAID] }, paidAt: { gte: since30 } }, select: { totalCents: true, paidAt: true } }),
    db.order.aggregate({ where: { status: { in: [...PAID] }, paidAt: { gte: since60, lt: since30 } }, _sum: { totalCents: true }, _count: true }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.user.count({ where: { role: "CUSTOMER", anonymizedAt: null } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since30 } } }),
    db.$queryRaw<Array<{ id: string; sku: string; name: string; productName: string; productId: string; available: number }>>`
      SELECT v."id", v."sku", v."name", p."name" AS "productName", p."id" AS "productId", (v."stock" - v."reserved")::int AS "available"
      FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId"
      WHERE v."isActive" = true AND p."deletedAt" IS NULL AND p."status" = 'PUBLISHED' AND v."stock" - v."reserved" <= ${LOW_STOCK_THRESHOLD}
      ORDER BY (v."stock" - v."reserved") ASC LIMIT 10`,
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, number: true, status: true, totalCents: true, customerName: true, createdAt: true } }),
    // Pagamentos aprovados em pedidos não pagos = exige ação (ex.: reembolso por falta de estoque) / divergência de valor.
    db.payment.findMany({
      where: { OR: [{ status: "APPROVED", order: { status: { in: ["CANCELLED", "EXPIRED"] } } }, { statusDetail: "amount_mismatch" }] },
      select: { id: true, orderId: true, statusDetail: true, order: { select: { number: true } } },
      take: 10,
    }),
    db.contactMessage.count({ where: { handledAt: null } }),
  ]);

  const revenue30 = paid30.reduce((a, o) => a + o.totalCents, 0);
  const prevRevenue = paidPrev._sum.totalCents ?? 0;

  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) byDay.set(dayKey(new Date(now.getTime() - i * 86_400_000)), 0);
  for (const o of paid30) {
    const k = dayKey(o.paidAt!);
    if (byDay.has(k)) byDay.set(k, byDay.get(k)! + o.totalCents);
  }

  return {
    revenue30,
    revenueDeltaPct: prevRevenue > 0 ? Math.round(((revenue30 - prevRevenue) / prevRevenue) * 100) : null,
    orders30: paid30.length,
    avgTicket: paid30.length ? Math.round(revenue30 / paid30.length) : 0,
    pendingCount,
    customers,
    newCustomers,
    lowStock,
    recentOrders,
    alerts,
    unread,
    daily: [...byDay.entries()].map(([day, cents]) => ({ day, cents })),
  };
}

/** Resumo financeiro dos últimos 30 dias (valores brutos, antes das tarifas do provedor). */
export async function getFinancialSummary() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [approved, refunded] = await Promise.all([
    db.payment.aggregate({ where: { status: { in: ["APPROVED", "REFUNDED"] }, approvedAt: { gte: since } }, _sum: { amountCents: true } }),
    db.refund.aggregate({ where: { status: "APPROVED", createdAt: { gte: since } }, _sum: { amountCents: true } }),
  ]);
  const gross = approved._sum.amountCents ?? 0;
  const refunds = refunded._sum.amountCents ?? 0;
  return { gross, refunds, net: gross - refunds };
}
