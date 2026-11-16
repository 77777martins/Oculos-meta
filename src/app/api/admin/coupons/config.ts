import { couponSchema } from "@/lib/validation/admin";
import { coupons } from "@/server/services/admin-entities";
import type { Permission } from "@/lib/auth/rbac";

export const config = {
  entity: "Coupon",
  permission: "coupons:write" as Permission,
  schema: couponSchema,
  create: (data: Parameters<typeof coupons.create>[0]) => coupons.create(data),
  update: (id: string, data: Parameters<typeof coupons.update>[1]) => coupons.update(id, data),
  remove: (id: string) => coupons.remove(id),
};
