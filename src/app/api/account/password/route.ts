import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { changePasswordSchema } from "@/lib/validation/auth";
import { changePassword } from "@/server/services/auth";

export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  const ctx = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.resetIp, `user:${user.id}`);
  const { currentPassword, newPassword } = await parseJson(req, changePasswordSchema);
  await changePassword(user.id, user.sessionId, currentPassword, newPassword, ctx);
  return ok({ success: true });
});
