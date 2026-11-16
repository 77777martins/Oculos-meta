import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const { products, categories } = await getSitemapEntries();
  const statics = ["", "/produtos", "/sobre", "/faq", "/contato", "/politica-de-privacidade", "/termos-de-uso", "/trocas-e-devolucoes"];
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: `${base}/categorias/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/produtos/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
