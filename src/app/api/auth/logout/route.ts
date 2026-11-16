import { apiHandler, ok } from "@/lib/http/api";
import { destroyCurrentSession } from "@/lib/auth/session";

export const POST = apiHandler(async () => {
  await destroyCurrentSession();
  return ok({ success: true });
});
