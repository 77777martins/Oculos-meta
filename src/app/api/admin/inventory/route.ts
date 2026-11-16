import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { stockAdjustmentSchema } from "@/lib/validation/catalog";
import { audit } from "@/server/services/audit";
import { adjustStock } from "@/server/services/inventory";

/** Ajuste manual de estoque (entrada, perda, inventário) — sempre registrado no livro-razão. */
export const POST = apiHandler(async (req) => {
  const { user, ip } = await adminGuard("inventory:write");
  const { variantId, delta, reason } = await parseJson(req, stockAdjustmentSchema);
  const stock = await db.$transaction((tx) => adjustStock(tx, variantId, delta, reason, user.id));
  await audit({ actorId: user.id, action: "inventory.adjust", entityType: "ProductVariant", entityId: variantId, metadata: { delta, reason }, ip });
  return ok({ stock });
});
