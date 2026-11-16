import { apiHandler, ok } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";

export const PATCH = apiHandler<{ id: string }>(async (_req, { params }) => {
  await adminGuard("messages:read");
  const id = await parseAdminId(params);
  await db.contactMessage.update({ where: { id }, data: { handledAt: new Date() } });
  return ok({ success: true });
});
