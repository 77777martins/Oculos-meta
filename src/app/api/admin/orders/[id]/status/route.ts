import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { adminGuard, parseAdminId } from "@/lib/http/admin-crud";
import { orderStatusUpdateSchema } from "@/lib/validation/admin";
import { adminUpdateOrderStatus } from "@/server/services/orders";

export const PATCH = apiHandler<{ id: string }>(async (req, { params }) => {
  const { user, ip } = await adminGuard("orders:update");
  const orderId = await parseAdminId(params);
  const { status, note } = await parseJson(req, orderStatusUpdateSchema);
  await adminUpdateOrderStatus({ orderId, to: status, note, actorId: user.id, ip });
  return ok({ success: true });
});
