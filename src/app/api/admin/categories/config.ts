import { categorySchema } from "@/lib/validation/catalog";
import { categories } from "@/server/services/admin-entities";
import type { Permission } from "@/lib/auth/rbac";

export const config = {
  entity: "Category",
  permission: "categories:write" as Permission,
  schema: categorySchema,
  create: (data: Parameters<typeof categories.create>[0]) => categories.create(data),
  update: (id: string, data: Parameters<typeof categories.update>[1]) => categories.update(id, data),
  remove: (id: string) => categories.remove(id),
};
