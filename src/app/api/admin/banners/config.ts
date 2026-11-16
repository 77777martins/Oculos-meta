import { bannerSchema } from "@/lib/validation/admin";
import { banners } from "@/server/services/admin-entities";
import type { Permission } from "@/lib/auth/rbac";

export const config = {
  entity: "Banner",
  permission: "banners:write" as Permission,
  schema: bannerSchema,
  create: (data: Parameters<typeof banners.create>[0]) => banners.create(data),
  update: (id: string, data: Parameters<typeof banners.update>[1]) => banners.update(id, data),
  remove: (id: string) => banners.remove(id),
};
