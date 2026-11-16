import { crudItem } from "@/lib/http/admin-crud";
import { productSchema } from "@/lib/validation/catalog";
import { archiveProduct, saveProduct } from "@/server/services/admin-products";

export const { PUT, DELETE } = crudItem({
  entity: "Product",
  permission: "products:write",
  schema: productSchema,
  create: (data, actorId) => saveProduct(null, data, actorId),
  update: (id, data, actorId) => saveProduct(id, data, actorId),
  remove: (id) => archiveProduct(id),
});
