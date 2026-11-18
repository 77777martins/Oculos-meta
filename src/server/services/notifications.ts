import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatBRL } from "@/lib/money";
import { trackingLink } from "@/lib/tracking";
import { formatDateTime } from "@/lib/utils";
import { orderClosedEmail, orderCreatedEmail, orderDeliveredEmail, orderPaidEmail, orderRefundedEmail, orderShippedEmail, sendMail } from "./mail";

/**
 * E-mails transacionais do ciclo do pedido.
 * Sempre chamados DEPOIS da transação que mudou o pedido: falha de e-mail
 * nunca desfaz uma operação. Contas anonimizadas (LGPD) não recebem nada.
 */
export type OrderNotification = "CREATED" | "PAID" | "SHIPPED" | "DELIVERED" | "EXPIRED" | "CANCELLED" | "REFUNDED";

export async function notifyOrder(orderId: string, kind: OrderNotification, extra: { refundCents?: number } = {}): Promise<void> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        customerName: true,
        customerEmail: true,
        totalCents: true,
        reservationExpiresAt: true,
        shipment: { select: { trackingCode: true, trackingUrl: true, carrier: true } },
        user: { select: { anonymizedAt: true } },
      },
    });
    if (!order || order.user.anonymizedAt || order.customerEmail.endsWith(".invalid")) return;

    const base = env().APP_URL;
    const orderLink = `${base}/conta/pedidos/${order.id}`;
    const firstName = order.customerName.split(" ")[0] ?? order.customerName;

    const message = (() => {
      switch (kind) {
        case "CREATED":
          return orderCreatedEmail(firstName, order.number, formatBRL(order.totalCents), `${base}/checkout/pagamento/${order.id}`, order.reservationExpiresAt ? formatDateTime(order.reservationExpiresAt) : null);
        case "PAID":
          return orderPaidEmail(firstName, order.number, orderLink);
        case "SHIPPED":
          return orderShippedEmail(firstName, order.number, orderLink, {
            code: order.shipment?.trackingCode ?? null,
            url: trackingLink(order.shipment?.trackingCode, order.shipment?.trackingUrl),
            carrier: order.shipment?.carrier ?? null,
          });
        case "DELIVERED":
          return orderDeliveredEmail(firstName, order.number, orderLink);
        case "EXPIRED":
        case "CANCELLED":
          return orderClosedEmail(firstName, order.number, kind, `${base}/produtos`);
        case "REFUNDED":
          return orderRefundedEmail(firstName, order.number, formatBRL(extra.refundCents ?? order.totalCents), orderLink);
      }
    })();

    await sendMail({ to: order.customerEmail, ...message });
  } catch (error) {
    logger.error("notification.failed", { orderId, kind, error });
  }
}
