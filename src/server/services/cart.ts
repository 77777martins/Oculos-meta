import "server-only";
import { db, type Tx } from "@/lib/db";
import { effectivePriceCents } from "@/lib/money";
import { mergeCartLines } from "./pricing";

export interface QuotedLine {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number;
  listPriceCents: number;
  requestedQuantity: number;
  quantity: number;
  available: number;
  weightGrams: number;
  lineTotalCents: number;
  /** Produto publicado e variante ativa (independe do estoque). */
  sellable: boolean;
  issue: "UNAVAILABLE" | "INSUFFICIENT_STOCK" | null;
}

/**
 * Recalcula o carrinho a partir do banco. O cliente envia apenas
 * variantId + quantidade; preço, nome, disponibilidade vêm daqui.
 */
export async function quoteCartLines(items: Array<{ variantId: string; quantity: number }>, tx?: Tx): Promise<QuotedLine[]> {
  const merged = mergeCartLines(items);
  if (merged.length === 0) return [];
  const client = tx ?? db;

  const variants = await client.productVariant.findMany({
    where: { id: { in: merged.map((m) => m.variantId) } },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          deletedAt: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  return merged.flatMap((item): QuotedLine[] => {
    const v = byId.get(item.variantId);
    if (!v) return [];
    const sellable = v.isActive && v.product.status === "PUBLISHED" && !v.product.deletedAt;
    const available = sellable ? Math.max(0, v.stock - v.reserved) : 0;
    const quantity = Math.min(item.quantity, available);
    const unitPriceCents = effectivePriceCents(v);
    return [
      {
        variantId: v.id,
        productId: v.product.id,
        productName: v.product.name,
        productSlug: v.product.slug,
        variantName: v.name,
        sku: v.sku,
        imageUrl: v.images[0]?.url ?? v.product.images[0]?.url ?? null,
        unitPriceCents,
        listPriceCents: v.priceCents,
        requestedQuantity: item.quantity,
        quantity,
        available,
        weightGrams: v.weightGrams,
        lineTotalCents: unitPriceCents * quantity,
        sellable,
        issue: !sellable || available === 0 ? "UNAVAILABLE" : quantity < item.quantity ? "INSUFFICIENT_STOCK" : null,
      },
    ];
  });
}
