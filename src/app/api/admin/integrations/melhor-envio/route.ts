import { apiHandler, ok } from "@/lib/http/api";
import { adminGuard } from "@/lib/http/admin-crud";
import { audit } from "@/server/services/audit";
import { disconnectMelhorEnvio } from "@/server/shipping/melhor-envio";

/** Desconecta a integração (apaga os tokens criptografados). */
export const DELETE = apiHandler(async () => {
  const { user, ip } = await adminGuard("settings:write");
  await disconnectMelhorEnvio();
  await audit({ actorId: user.id, action: "integration.melhorenvio_disconnected", entityType: "Integration", entityId: "MELHOR_ENVIO", ip });
  return ok({ success: true });
});
