import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { reviewModerationSchema } from "@/lib/validation/review";
import { audit } from "@/server/services/audit";
import { moderateReview } from "@/server/services/reviews";

/** Aprova ou recusa uma avaliação (com trilha de auditoria). */
export const PATCH = apiHandler<{ id: string }>(async (req, { params }) => {
  const { user, ip } = await adminGuard("products:write");
  const id = await parseAdminId(params);
  const { status } = await parseJson(req, reviewModerationSchema);
  const result = await moderateReview(id, status);
  await audit({ actorId: user.id, action: `review.${status.toLowerCase()}`, entityType: "Review", entityId: id, ip });
  return ok(result);
});
