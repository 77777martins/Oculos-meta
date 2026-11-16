import { cookies } from "next/headers";
import { z } from "zod";
import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { deleteAccount } from "@/server/services/privacy";

const schema = z.strictObject({ password: z.string().min(1).max(128), confirm: z.literal("EXCLUIR", { error: 'Digite "EXCLUIR" para confirmar.' }) });

/** LGPD: exclusão (anonimização) da conta. Exige senha — ação irreversível. */
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  const { ip } = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.resetIp, `delete:${user.id}`);
  const { password } = await parseJson(req, schema);
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(record.passwordHash, password))) throw new ValidationError("Senha incorreta.");
  await deleteAccount(user.id, ip);
  (await cookies()).delete(SESSION_COOKIE);
  return ok({ success: true });
});
