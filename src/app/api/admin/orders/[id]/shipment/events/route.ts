import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { shipmentEventSchema } from "@/lib/validation/admin";
import { audit } from "@/server/services/audit";
import { recordShipmentEvent } from "@/server/services/shipments";

/**
 * Registra uma movimentação informada pela transportadora. Não há simulação:
 * cada evento é lançado pela equipe (ou sincronizado do Melhor Envio) com data real.
 */
export const POST = apiHandler<{ id: string }>(async (req, { params }) => {
  const { user, ip } = await adminGuard("orders:update");
  const orderId = await parseAdminId(params);
  const data = await parseJson(req, shipmentEventSchema);
  if (!(await db.shipment.count({ where: { orderId } }))) throw new NotFoundError("Cadastre o código de rastreio antes de lançar movimentações.");
  await recordShipmentEvent({ orderId, ...data, actorId: user.id, ip });
  await audit({ actorId: user.id, action: "shipment.event", entityType: "Order", entityId: orderId, metadata: { status: data.status }, ip });
  return ok({ success: true }, { status: 201 });
});
