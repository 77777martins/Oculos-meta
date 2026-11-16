import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPassword } from "@/server/services/auth";

export const POST = apiHandler(async (req) => {
  const ctx = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.resetIp, ctx.ip);
  const { token, password } = await parseJson(req, resetPasswordSchema);
  await resetPassword(token, password, ctx);
  return ok({ success: true });
});
