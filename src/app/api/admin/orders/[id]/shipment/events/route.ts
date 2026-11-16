import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { shipmentEventSchema } from "@/lib/validation/admin";
import { audit } from "@/server/services/audit";
import { adminUpdateOrderStatus } from "@/server/services/orders";
import { canTransitionManually } from "@/server/services/order-state";

/**
 * Registra uma movimentação informada pela transportadora. Não há simulação:
 * cada evento é lançado pela equipe (ou por integração futura) com data real.
 */
export const POST = apiHandler<{ id: string }>(async (req, { params }) => {
  const { user, ip } = await adminGuard("orders:update");
  const orderId = await parseAdminId(params);
  const data = await parseJson(req, shipmentEventSchema);
  const shipment = await db.shipment.findUnique({ where: { orderId }, include: { order: { select: { status: true } } } });
  if (!shipment) throw new NotFoundError("Cadastre o código de rastreio antes de lançar movimentações.");

  await db.$transaction([
    db.shipmentEvent.create({ data: { shipmentId: shipment.id, ...data, actorId: user.id } }),
    db.shipment.update({
      where: { id: shipment.id },
      data: {
        status: data.status,
        ...(data.status === "POSTED" && !shipment.shippedAt ? { shippedAt: data.occurredAt } : {}),
        ...(data.status === "DELIVERED" ? { deliveredAt: data.occurredAt } : {}),
      },
    }),
  ]);

  // Reflete no pedido quando a transição é válida.
  const target = data.status === "DELIVERED" ? "DELIVERED" : data.status === "POSTED" || data.status === "IN_TRANSIT" ? "SHIPPED" : null;
  if (target && canTransitionManually(shipment.order.status, target)) {
    await adminUpdateOrderStatus({ orderId, to: target, note: data.description, actorId: user.id, ip });
  }
  await audit({ actorId: user.id, action: "shipment.event", entityType: "Order", entityId: orderId, metadata: { status: data.status }, ip });
  return ok({ success: true }, { status: 201 });
});
