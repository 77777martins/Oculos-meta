import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { effectivePriceCents } from "@/lib/money";

/** Somente produtos publicados, não excluídos, com ao menos uma variante ativa. */
const publicWhere: Prisma.ProductWhereInput = {
  status: "PUBLISHED",
  deletedAt: null,
  variants: { some: { isActive: true } },
};

const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, alt: true, sunUrl: true } },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, priceCents: true, salePriceCents: true, stock: true, reserved: true, colorHex: true, color: true },
  },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductInclude;

type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  model: string;
  brand: string;
  category: string | null;
  categorySlug: string | null;
  /** `sunUrl`: mesma foto com a lente escurecida (efeito automático). */
  image: { url: string; alt: string; sunUrl: string | null } | null;
  hoverImage: { url: string; alt: string } | null;
  priceCents: number;
  listPriceCents: number;
  inStock: boolean;
  colors: Array<{ name: string | null; hex: string }>;
  defaultVariantId: string | null;
}

function toCard(p: CardProduct): ProductCardData {
  const cheapest = [...p.variants].sort((a, b) => effectivePriceCents(a) - effectivePriceCents(b))[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    model: p.model,
    brand: p.brand,
    category: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    image: p.images[0] ?? null,
    hoverImage: p.images[1] ?? null,
    priceCents: cheapest ? effectivePriceCents(cheapest) : 0,
    listPriceCents: cheapest?.priceCents ?? 0,
    inStock: p.variants.some((v) => v.stock - v.reserved > 0),
    colors: p.variants.filter((v) => v.colorHex).map((v) => ({ name: v.color, hex: v.colorHex! })).slice(0, 6),
    defaultVariantId: p.variants.length === 1 ? p.variants[0]!.id : null,
  };
}

export const PAGE_SIZE = 12;

export interface CatalogFilters {
  q?: string;
  categoria?: string;
  ordem: "relevancia" | "menor-preco" | "maior-preco" | "novidades";
  page: number;
  min?: number;
  max?: number;
}

/**
 * Listagem com filtros. A ordenação por preço é feita em memória sobre o
 * preço EFETIVO (promoção) — adequado ao tamanho de catálogo de uma loja
 * especializada. Para catálogos muito grandes, materialize o preço mínimo
 * em coluna própria.
 */
export async function listProducts(filters: CatalogFilters) {
  const where: Prisma.ProductWhereInput = { ...publicWhere };
  if (filters.categoria) where.category = { slug: filters.categoria, isActive: true };
  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { variants: { some: { OR: [{ color: { contains: q, mode: "insensitive" } }, { sku: { contains: q.toUpperCase() } }] } } },
    ];
  }

  const rows = await db.product.findMany({
    where,
    include: cardInclude,
    orderBy: filters.ordem === "novidades" ? { publishedAt: "desc" } : [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: 500,
  });

  let cards = rows.map(toCard);
  if (filters.min !== undefined) cards = cards.filter((c) => c.priceCents >= filters.min! * 100);
  if (filters.max !== undefined) cards = cards.filter((c) => c.priceCents <= filters.max! * 100);
  if (filters.ordem === "menor-preco") cards.sort((a, b) => a.priceCents - b.priceCents);
  if (filters.ordem === "maior-preco") cards.sort((a, b) => b.priceCents - a.priceCents);

  const total = cards.length;
  const start = (filters.page - 1) * PAGE_SIZE;
  return { items: cards.slice(start, start + PAGE_SIZE), total, page: filters.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFeaturedProducts(limit = 8) {
  const rows = await db.product.findMany({
    where: { ...publicWhere },
    include: cardInclude,
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
  return rows.map(toCard);
}

export const getProductBySlug = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return null;
  const product = await db.product.findFirst({
    where: { slug, ...publicWhere },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, alt: true, variantId: true, width: true, height: true, credit: true, creditUrl: true, sunUrl: true } },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sku: true, name: true, color: true, colorHex: true, lens: true, size: true, priceCents: true, salePriceCents: true, stock: true, reserved: true },
      },
    },
  });
  if (!product) return null;
  return {
    ...product,
    specs: Array.isArray(product.specs) ? (product.specs as Array<{ label: string; value: string }>) : [],
    variants: product.variants.map(({ stock, reserved, ...v }) => ({ ...v, available: Math.max(0, stock - reserved) })),
  };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  const rows = await db.product.findMany({
    where: { ...publicWhere, id: { not: productId }, ...(categoryId ? { categoryId } : {}) },
    include: cardInclude,
    take: limit,
    orderBy: { publishedAt: "desc" },
  });
  return rows.map(toCard);
}

export const getActiveCategories = cache(async () =>
  db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, description: true, imageUrl: true } }),
);

export async function getActiveBanners() {
  const now = new Date();
  return db.banner.findMany({
    where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    orderBy: { sortOrder: "asc" },
    take: 5,
  });
}

export async function getFavoriteProducts(userId: string) {
  const favorites = await db.favorite.findMany({
    where: { userId, product: { ...publicWhere } },
    include: { product: { include: cardInclude } },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((f) => toCard(f.product));
}

/** Todas as imagens com crédito (página pública de atribuições). */
export async function getImageCredits() {
  return db.productImage.findMany({
    where: { credit: { not: null }, product: { ...publicWhere } },
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, url: true, alt: true, credit: true, creditUrl: true, product: { select: { name: true, slug: true } } },
  });
}

export async function getSitemapEntries() {
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: publicWhere, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return { products, categories };
}
