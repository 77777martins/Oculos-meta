import { apiHandler, ok } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { idSchema } from "@/lib/validation/common";
import { expireIfDue } from "@/server/services/orders";
import { refreshOrderPaymentStatus } from "@/server/payments/service";

/** Consulta de status (polling da página de pagamento). Confirma com o provedor, nunca com o cliente. */
export const GET = apiHandler<{ id: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) throw new NotFoundError("Pedido não encontrado.");
  await enforceRateLimit(RATE_LIMITS.paymentStatus, user.id);
  const result = await refreshOrderPaymentStatus(parsedId.data, user.id);
  if (result.orderStatus === "PENDING_PAYMENT") {
    await expireIfDue(parsedId.data);
    return ok(await refreshOrderPaymentStatus(parsedId.data, user.id, { queryProvider: false }));
  }
  return ok(result);
});
