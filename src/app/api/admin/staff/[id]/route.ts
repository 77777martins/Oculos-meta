import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { staffUpdateSchema } from "@/lib/validation/admin";
import { setUserRole } from "@/server/services/staff";

export const PATCH = apiHandler<{ id: string }>(async (req, { params }) => {
  const { user, ip } = await adminGuard("staff:manage");
  const targetId = await parseAdminId(params);
  const { role } = await parseJson(req, staffUpdateSchema);
  await setUserRole({ targetId, role, actorId: user.id, ip });
  return ok({ success: true });
});
