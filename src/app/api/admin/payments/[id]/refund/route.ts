import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { refundSchema } from "@/lib/validation/admin";
import { refundPayment } from "@/server/payments/service";

/** Reembolso real via API do Mercado Pago (somente ADMIN — permissão payments:refund). */
export const POST = apiHandler<{ id: string }>(async (req, { params }) => {
  const { user, ip } = await adminGuard("payments:refund");
  const paymentId = await parseAdminId(params);
  const { amountCents, reason } = await parseJson(req, refundSchema);
  return ok(await refundPayment({ paymentId, amountCents, reason, actorId: user.id, ip }));
});
