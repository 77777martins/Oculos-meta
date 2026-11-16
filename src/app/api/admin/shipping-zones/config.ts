import { shippingZoneSchema } from "@/lib/validation/admin";
import { shippingZones } from "@/server/services/admin-entities";
import type { Permission } from "@/lib/auth/rbac";

export const config = {
  entity: "ShippingZone",
  permission: "shipping:write" as Permission,
  schema: shippingZoneSchema,
  create: (data: Parameters<typeof shippingZones.create>[0]) => shippingZones.create(data),
  update: (id: string, data: Parameters<typeof shippingZones.update>[1]) => shippingZones.update(id, data),
  remove: (id: string) => shippingZones.remove(id),
};
