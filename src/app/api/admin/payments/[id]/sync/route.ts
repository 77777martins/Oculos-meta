import { apiHandler, ok } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { audit } from "@/server/services/audit";
import { syncProviderPayment } from "@/server/payments/service";

/** Conciliação manual: consulta o status atual no Mercado Pago. */
export const POST = apiHandler<{ id: string }>(async (_req, { params }) => {
  const { user, ip } = await adminGuard("payments:read");
  const id = await parseAdminId(params);
  const payment = await db.payment.findUnique({ where: { id }, select: { providerPaymentId: true } });
  if (!payment?.providerPaymentId) throw new NotFoundError("Pagamento sem ID no provedor.");
  const updated = await syncProviderPayment(payment.providerPaymentId, { source: "reconcile", eventKey: `manual:${id}:${Date.now()}`, signatureValid: true });
  await audit({ actorId: user.id, action: "payment.manual_sync", entityType: "Payment", entityId: id, ip });
  return ok({ status: updated.status });
});
