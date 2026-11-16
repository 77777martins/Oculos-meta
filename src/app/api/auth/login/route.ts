import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { isStaff } from "@/lib/auth/rbac";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/auth";
import { loginUser } from "@/server/services/auth";

export const POST = apiHandler(async (req) => {
  const ctx = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.loginIp, ctx.ip);
  const input = await parseJson(req, loginSchema);
  const user = await loginUser(input, ctx);
  return ok({ isStaff: isStaff(user.role) });
});
