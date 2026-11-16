import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/conta", "/checkout", "/carrinho", "/api/", "/entrar", "/cadastro", "/recuperar-senha", "/redefinir-senha", "/busca"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
