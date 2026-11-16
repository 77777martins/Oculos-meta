import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, consumeRateLimit, enforceRateLimit } from "@/lib/security/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/server/services/auth";

const GENERIC = "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.";

export const POST = apiHandler(async (req) => {
  const ctx = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.forgotIp, ctx.ip);
  const { email } = await parseJson(req, forgotPasswordSchema);
  // Limite por e-mail aplicado silenciosamente (não revela existência da conta).
  const perEmail = await consumeRateLimit(RATE_LIMITS.forgotEmail, email);
  if (perEmail.allowed) await requestPasswordReset(email, ctx);
  return ok({ message: GENERIC });
});
