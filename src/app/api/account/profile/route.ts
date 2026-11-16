import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { profileSchema } from "@/lib/validation/admin";
import { onlyDigits } from "@/lib/utils";

export const PATCH = apiHandler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.account, user.id);
  const input = await parseJson(req, profileSchema);
  const phone = input.phone ? onlyDigits(input.phone) : null;
  if (phone && phone.length !== 10 && phone.length !== 11) throw new ValidationError("Telefone inválido (com DDD).");
  // Apenas campos permitidos são atualizados (sem mass assignment de role, e-mail etc.).
  await db.user.update({ where: { id: user.id }, data: { name: input.name, phone } });
  return ok({ success: true });
});
