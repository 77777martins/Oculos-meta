import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** Itens por coluna do menu: o suficiente para orientar sem virar uma listagem. */
const MENU_PRODUCTS_PER_CATEGORY = 8;

export interface NavCategory {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  products: Array<{ name: string; slug: string; model: string }>;
}

/**
 * Dados do menu principal (cabeçalho e menu móvel): categorias ativas com os
 * modelos publicados de cada uma. Uma única consulta por requisição (React cache).
 */
export const getNavigation = cache(async (): Promise<NavCategory[]> => {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      products: {
        where: { status: "PUBLISHED", deletedAt: null, variants: { some: { isActive: true } } },
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        take: MENU_PRODUCTS_PER_CATEGORY,
        select: { name: true, slug: true, model: true },
      },
    },
  });
  return categories;
});
