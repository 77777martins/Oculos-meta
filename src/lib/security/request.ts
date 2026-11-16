import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { ForbiddenError } from "@/lib/errors";

/**
 * IP do cliente. Na Vercel, `x-forwarded-for` é definido pela borda da
 * plataforma (o primeiro valor é o IP real). Fora dela, configure o proxy
 * reverso para sobrescrever esse cabeçalho.
 */
export function getClientIp(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "0.0.0.0";
}

export async function getRequestContext() {
  const h = await headers();
  return { ip: getClientIp(h), userAgent: h.get("user-agent")?.slice(0, 512) ?? null };
}

/**
 * Proteção CSRF para requisições que alteram estado.
 * Cookies já são SameSite=Lax; validamos também Origin/Referer contra a
 * URL da aplicação (defesa em profundidade recomendada pela OWASP).
 */
export function assertSameOrigin(req: Request): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const allowed = new Set([new URL(env().APP_URL).origin]);
  // A própria origem da requisição (útil em previews da Vercel com domínio dinâmico).
  try {
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
    if (host) allowed.add(`${proto}://${host}`);
  } catch {
    /* ignora */
  }

  const origin = req.headers.get("origin");
  if (origin) {
    if (!allowed.has(origin)) throw new ForbiddenError("Origem da requisição não permitida.");
    return;
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (allowed.has(new URL(referer).origin)) return;
    } catch {
      /* cai no erro abaixo */
    }
  }
  throw new ForbiddenError("Origem da requisição não permitida.");
}
