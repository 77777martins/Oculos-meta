import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard } from "@/lib/http/admin-crud";
import { staffInviteSchema } from "@/lib/validation/admin";
import { promoteByEmail } from "@/server/services/staff";

export const POST = apiHandler(async (req) => {
  const { user, ip } = await adminGuard("staff:manage");
  const { email, role } = await parseJson(req, staffInviteSchema);
  await promoteByEmail({ email, role, actorId: user.id, ip });
  return ok({ success: true });
});
