import { z } from "zod";
import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getRequestContext } from "@/lib/security/request";
import { hashIp } from "@/lib/security/crypto";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { POLICY_VERSION } from "@/server/services/auth";

const schema = z.strictObject({ analytics: z.boolean() });

/** Registro de consentimento de cookies (LGPD art. 8º — prova do consentimento). */
export const POST = apiHandler(async (req) => {
  const ctx = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.contact, `consent:${ctx.ip}`);
  const { analytics } = await parseJson(req, schema);
  const user = await getCurrentUser();
  await db.consentRecord.create({
    data: {
      userId: user?.id ?? null,
      type: "COOKIES_ANALYTICS",
      version: POLICY_VERSION,
      granted: analytics,
      ipHash: hashIp(ctx.ip),
      userAgent: ctx.userAgent,
    },
  });
  return ok({ recorded: true });
});
