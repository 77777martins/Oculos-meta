import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { shipmentSchema } from "@/lib/validation/admin";
import { audit } from "@/server/services/audit";

/** Cadastra/atualiza transportadora e código de rastreio (somente pedidos pagos). */
export const PUT = apiHandler<{ id: string }>(async (req, { params }) => {
  const { user, ip } = await adminGuard("orders:update");
  const orderId = await parseAdminId(params);
  const data = await parseJson(req, shipmentSchema);
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) throw new NotFoundError("Pedido não encontrado.");
  if (!["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) throw new ConflictError("Somente pedidos pagos podem receber rastreio.");
  const shipment = await db.shipment.upsert({ where: { orderId }, create: { orderId, ...data }, update: data });
  await audit({ actorId: user.id, action: "shipment.update", entityType: "Order", entityId: orderId, metadata: { trackingCode: data.trackingCode }, ip });
  return ok({ id: shipment.id });
});
