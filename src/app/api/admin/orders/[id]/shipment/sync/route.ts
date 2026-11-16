import { apiHandler, ok } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { ValidationError } from "@/lib/errors";
import { linkAndSyncShipment } from "@/server/shipping/tracking-sync";

/** Sincroniza o rastreio deste pedido com o Melhor Envio sob demanda. */
export const POST = apiHandler<{ id: string }>(async (_req, { params }) => {
  await adminGuard("orders:update");
  const orderId = await parseAdminId(params);
  const result = await linkAndSyncShipment(orderId);
  if (!result.linked) throw new ValidationError("Etiqueta não encontrada no Melhor Envio para este código de rastreio (ou integração desativada).");
  return ok(result);
});
