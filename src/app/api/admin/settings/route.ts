import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { settingsSchema } from "@/lib/validation/admin";
import { audit } from "@/server/services/audit";

export const PUT = apiHandler(async (req) => {
  const { user, ip } = await adminGuard("settings:write");
  const data = await parseJson(req, settingsSchema);
  await db.storeSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  await audit({ actorId: user.id, action: "settings.update", entityType: "StoreSettings", entityId: "default", ip });
  return ok({ success: true });
});
