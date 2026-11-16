import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { shipmentSchema } from "@/lib/validation/admin";
import { audit } from "@/server/services/audit";
import { logger } from "@/lib/logger";
import { linkAndSyncShipment } from "@/server/shipping/tracking-sync";

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
  // Código novo/alterado: desvincula a etiqueta anterior e tenta localizar no Melhor Envio (não bloqueia em caso de falha).
  await db.shipment.update({ where: { id: shipment.id }, data: { providerOrderId: null, providerStatus: null, lastSyncedAt: null } });
  const sync = await linkAndSyncShipment(orderId).catch((error) => {
    logger.warn("shipment.link_failed", { orderId, error });
    return { linked: false, status: null };
  });
  return ok({ id: shipment.id, melhorEnvio: sync });
});
