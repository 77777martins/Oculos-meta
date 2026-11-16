import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { db } from "@/lib/db";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { contactSchema } from "@/lib/validation/admin";

export const POST = apiHandler(async (req) => {
  const { ip } = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.contact, ip);
  const { website, ...data } = await parseJson(req, contactSchema);
  // Honeypot preenchido = bot. Responde sucesso sem gravar (não dá pistas ao bot).
  if (!website) await db.contactMessage.create({ data });
  return ok({ success: true }, { status: 201 });
});
