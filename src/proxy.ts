import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antigo middleware) executado antes de cada página:
 * 1. Gera um nonce por requisição e aplica Content-Security-Policy estrita
 *    ('strict-dynamic' + nonce): scripts injetados por XSS não executam.
 * 2. Redirecionamento otimista de áreas protegidas quando não há cookie de
 *    sessão (a verificação REAL acontece no servidor, em cada layout/rota).
 */

const SESSION_COOKIES = ["__Host-oms_session", "oms_session"];
const PROTECTED_PREFIXES = ["/conta", "/admin", "/checkout"];

// Domínios exigidos pelo Mercado Pago (Bricks/SDK JS v2).
const MP = {
  connect: "https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com https://*.mlstatic.com",
  frame: "https://*.mercadopago.com https://*.mercadopago.com.br https://*.mercadolibre.com https://*.mercadolivre.com",
  img: "https://*.mlstatic.com https://*.mercadopago.com https://*.mercadolibre.com",
};

/** Origem exata do Sentry derivada do DSN (sem curingas). */
function sentryOrigin(): string {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "";
  try {
    const u = new URL(dsn);
    return u.protocol === "https:" ? ` https://${u.host}` : "";
  } catch {
    return "";
  }
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://sdk.mercadopago.com https://http2.mlstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com ${MP.img}`,
    "font-src 'self' data:",
    `connect-src 'self' ${MP.connect}${sentryOrigin()}${isDev ? " ws: wss:" : ""}`,
    `frame-src ${MP.frame}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...((process.env.APP_URL ?? "").startsWith("https://") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|images|uploads|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
