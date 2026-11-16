import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/security/crypto";
import { purgeExpiredRateLimits } from "@/lib/security/rate-limit";
import { purgeExpiredSessions } from "@/lib/auth/session";
import { expireOrder, findExpiredPendingOrderIds } from "@/server/services/orders";
import { syncProviderPayment } from "@/server/payments/service";
import { getPaymentGateway } from "@/server/payments/mercadopago";

/**
 * Tarefa agendada (Vercel Cron): expira pedidos não pagos, liberando estoque.
 * Antes de expirar, concilia com o provedor — se o PIX foi pago e o webhook
 * atrasou, o pedido é confirmado em vez de expirado.
 * Autenticação: Authorization: Bearer <CRON_SECRET> (comparação em tempo constante).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = env().CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ids = await findExpiredPendingOrderIds(200);
  let expired = 0;
  let reconciled = 0;

  for (const orderId of ids) {
    try {
      if (getPaymentGateway().isConfigured()) {
        const pending = await db.payment.findMany({ where: { orderId, status: { in: ["PENDING", "IN_PROCESS"] }, providerPaymentId: { not: null } }, select: { id: true, providerPaymentId: true } });
        for (const p of pending) {
          await syncProviderPayment(p.providerPaymentId!, { source: "reconcile", eventKey: `reconcile:${p.id}:${Date.now()}`, signatureValid: true });
          reconciled++;
        }
      }
      if (await expireOrder(orderId)) expired++;
    } catch (error) {
      logger.error("cron.expire_order_failed", { orderId, error });
    }
  }

  const [sessions, buckets] = await Promise.all([purgeExpiredSessions(), purgeExpiredRateLimits()]);
  logger.info("cron.expire_orders.done", { candidates: ids.length, expired, reconciled, sessions, buckets });
  return NextResponse.json({ candidates: ids.length, expired, reconciled });
}
