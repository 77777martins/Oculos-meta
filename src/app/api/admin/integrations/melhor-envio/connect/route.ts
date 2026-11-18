import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { env, isProduction } from "@/lib/env";
import { generateToken } from "@/lib/security/crypto";
import { authorizeUrl, isMelhorEnvioConfigured, OAUTH_STATE_COOKIE } from "@/server/shipping/melhor-envio";

/**
 * Inicia o OAuth2 com o Melhor Envio. O `state` aleatório fica em cookie
 * HttpOnly de curta duração e é conferido no callback (proteção CSRF do OAuth).
 */
export async function GET() {
  const base = env().APP_URL;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "settings:write")) return NextResponse.redirect(`${base}/entrar?next=/admin/configuracoes`);
  if (!isMelhorEnvioConfigured()) return NextResponse.redirect(`${base}/admin/configuracoes?me=nao-configurado`);

  const state = generateToken(24);
  (await cookies()).set(OAUTH_STATE_COOKIE, `${state}.${user.id}`, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax", // precisa voltar no redirecionamento vindo do Melhor Envio
    path: "/api/integrations/melhor-envio",
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(authorizeUrl(state));
}
