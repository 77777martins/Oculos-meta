import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { reviewSchema } from "@/lib/validation/review";
import { createReview } from "@/server/services/reviews";

/** Avaliação de produto: exige login e pedido ENTREGUE contendo o produto. Fica pendente até a moderação. */
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.account, user.id);
  const data = await parseJson(req, reviewSchema);
  return ok(await createReview({ userId: user.id, ...data }), { status: 201 });
});
