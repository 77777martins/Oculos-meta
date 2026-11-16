import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { paymentRequestSchema } from "@/lib/validation/checkout";
import { idSchema } from "@/lib/validation/common";
import { createCardPayment, createPixPayment } from "@/server/payments/service";

/** Inicia o pagamento de um pedido do próprio cliente. O valor vem do pedido no banco. */
export const POST = apiHandler<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) throw new NotFoundError("Pedido não encontrado.");
  await enforceRateLimit(RATE_LIMITS.payment, user.id);

  const body = await parseJson(req, paymentRequestSchema);
  const payment =
    body.method === "pix"
      ? await createPixPayment(parsedId.data, user.id)
      : await createCardPayment(parsedId.data, user.id, {
          attemptId: body.attemptId,
          token: body.token,
          paymentMethodId: body.paymentMethodId,
          issuerId: body.issuerId,
          installments: body.installments,
          payerEmail: body.payerEmail,
          identificationType: body.identificationType,
          identificationNumber: body.identificationNumber,
        });

  // Resposta mínima: nunca devolve dados internos ou do provedor além do necessário.
  return ok({
    id: payment.id,
    method: payment.method,
    status: payment.status,
    statusDetail: payment.statusDetail,
    pixQrCode: payment.pixQrCode,
    pixQrCodeBase64: payment.pixQrCodeBase64,
    ticketUrl: payment.ticketUrl,
    expiresAt: payment.expiresAt,
  });
});
