import { PrismaClient } from "@prisma/client";

/**
 * Zera os contadores de rate limit antes da suíte E2E (várias execuções
 * seguidas do mesmo IP atingiriam o limite de cadastros, que é o comportamento
 * correto em produção). Recusa rodar contra produção.
 */
export default async function globalSetup() {
  if (process.env.NODE_ENV === "production" || /prod/i.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("E2E não deve ser executado contra o banco de produção.");
  }
  const db = new PrismaClient();
  try {
    await db.rateLimitBucket.deleteMany();
    // Pedidos pendentes criados por execuções ANTERIORES dos E2E seguram estoque
    // (localmente não há cron para expirá-los). Libera a reserva e expira-os,
    // para cada execução começar do mesmo estado. Restrito aos e-mails de teste.
    await db.$transaction(async (tx) => {
      const stale = await tx.order.findMany({
        where: { status: "PENDING_PAYMENT", customerEmail: { endsWith: "@example.com" } },
        include: { items: true },
      });
      for (const order of stale) {
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.$executeRaw`UPDATE "ProductVariant" SET "reserved" = GREATEST("reserved" - ${item.quantity}, 0) WHERE "id" = ${item.variantId}`;
        }
        await tx.couponRedemption.deleteMany({ where: { orderId: order.id } });
        await tx.order.update({ where: { id: order.id }, data: { status: "EXPIRED", reservationExpiresAt: null, cancelledAt: new Date() } });
      }
    });
  } finally {
    await db.$disconnect();
  }
}
