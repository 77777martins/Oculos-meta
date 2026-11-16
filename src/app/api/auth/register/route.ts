import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/server/services/auth";

export const POST = apiHandler(async (req) => {
  const ctx = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.register, ctx.ip);
  const input = await parseJson(req, registerSchema);
  await registerUser(input, ctx);
  return ok({ success: true }, { status: 201 });
});
