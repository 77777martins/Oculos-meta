import { apiHandler, ok } from "@/lib/http/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { lookupCep } from "@/server/services/shipping";

export const GET = apiHandler<{ zip: string }>(async (_req, { params }) => {
  const { zip } = await params;
  if (!/^\d{8}$/.test(zip)) throw new ValidationError("CEP inválido.");
  const { ip } = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.quote, ip);
  const result = await lookupCep(zip);
  if (!result) throw new NotFoundError("CEP não encontrado.");
  return ok(result);
});
