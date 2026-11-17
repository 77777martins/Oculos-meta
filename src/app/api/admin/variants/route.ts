import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard } from "@/lib/http/admin-crud";
import { requireApiPermission } from "@/lib/auth/guards";
import { bulkVariantUpdateSchema } from "@/lib/validation/catalog";
import { bulkUpdateVariants } from "@/server/services/bulk-variants";

/** Edição em massa de preço e estoque. Exige products:write E inventory:write. */
export const PATCH = apiHandler(async (req) => {
  const { user, ip } = await adminGuard("products:write");
  await requireApiPermission("inventory:write");
  const data = await parseJson(req, bulkVariantUpdateSchema);
  return ok(await bulkUpdateVariants(data, user.id, ip));
});
