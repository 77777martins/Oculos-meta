import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { safeEqual } from "@/lib/security/crypto";
import { getRequestContext } from "@/lib/security/request";
import { audit } from "@/server/services/audit";
import { exchangeAuthorizationCode, OAUTH_STATE_COOKIE } from "@/server/shipping/melhor-envio";

/**
 * Callback do OAuth2 (URL a cadastrar no aplicativo do Melhor Envio).
 * Exige: sessão de administrador + `state` idêntico ao cookie emitido para o MESMO usuário.
 */
export async function GET(req: Request) {
  const base = env().APP_URL;
  const done = (status: string) => NextResponse.redirect(`${base}/admin/configuracoes?me=${status}`);
  const url = new URL(req.url);
  const jar = await cookies();
  const stored = jar.get(OAUTH_STATE_COOKIE)?.value ?? "";
  jar.delete({ name: OAUTH_STATE_COOKIE, path: "/api/integrations/melhor-envio" });

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "settings:write")) return NextResponse.redirect(`${base}/entrar?next=/admin/configuracoes`);

  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const [expectedState, stateUser] = stored.split(".");
  if (!expectedState || !state || stateUser !== user.id || !safeEqual(state, expectedState)) {
    logger.warn("integration.melhorenvio_invalid_state");
    return done("estado-invalido");
  }
  if (!code || code.length > 2048) return done("negado");

  try {
    await exchangeAuthorizationCode(code, user.id);
    const { ip } = await getRequestContext();
    await audit({ actorId: user.id, action: "integration.melhorenvio_connected", entityType: "Integration", entityId: "MELHOR_ENVIO", ip });
    return done("conectado");
  } catch (error) {
    logger.error("integration.melhorenvio_exchange_failed", { error });
    return done("erro");
  }
}
