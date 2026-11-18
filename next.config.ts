import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isProd = process.env.NODE_ENV === "production";

/**
 * Cabeçalhos de segurança estáticos. A Content-Security-Policy é gerada por
 * requisição em `src/proxy.ts` (precisa de nonce).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Uploads locais (dev): nunca executar como HTML/script.
      { source: "/uploads/:path*", headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; img-src 'self'; sandbox" }] },
    ];
  },
};

// Sem SENTRY_AUTH_TOKEN o build segue normalmente, apenas sem enviar source maps.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
