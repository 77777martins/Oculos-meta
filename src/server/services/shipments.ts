import "server-only";
import type { OrderStatus, ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { adminUpdateOrderStatus } from "./orders";
import { canTransitionManually } from "./order-state";

/**
 * Registra uma movimentação de entrega e reflete no status do pedido.
 * Usado pela equipe (lançamento manual) e pela sincronização automática com o
 * provedor logístico (actorId null). Fonte única da regra — sem duplicação.
 */
export async function recordShipmentEvent(input: {
  orderId: string;
  status: Exclude<ShipmentStatus, "PENDING">;
  description: string;
  location?: string | null;
  occurredAt: Date;
  actorId: string | null;
  ip: string | null;
}): Promise<void> {
  const shipment = await db.shipment.findUniqueOrThrow({ where: { orderId: input.orderId }, include: { order: { select: { status: true } } } });

  await db.$transaction([
    db.shipmentEvent.create({
      data: { shipmentId: shipment.id, status: input.status, description: input.description, location: input.location ?? null, occurredAt: input.occurredAt, actorId: input.actorId },
    }),
    db.shipment.update({
      where: { id: shipment.id },
      data: {
        status: input.status,
        ...(input.status === "POSTED" && !shipment.shippedAt ? { shippedAt: input.occurredAt } : {}),
        ...(input.status === "DELIVERED" ? { deliveredAt: input.occurredAt } : {}),
      },
    }),
  ]);

  // Reflete no pedido seguindo a máquina de estados (pago → enviado → entregue).
  const target: OrderStatus | null = input.status === "DELIVERED" ? "DELIVERED" : input.status === "POSTED" || input.status === "IN_TRANSIT" ? "SHIPPED" : null;
  if (!target) return;
  let current = shipment.order.status;
  if (target === "DELIVERED" && canTransitionManually(current, "SHIPPED")) {
    await adminUpdateOrderStatus({ orderId: input.orderId, to: "SHIPPED", note: "Objeto postado", actorId: input.actorId, ip: input.ip });
    current = "SHIPPED";
  }
  if (canTransitionManually(current, target)) {
    await adminUpdateOrderStatus({ orderId: input.orderId, to: target, note: input.description, actorId: input.actorId, ip: input.ip });
  }
}
