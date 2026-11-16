import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { z } from "zod";
import type { productSchema } from "@/lib/validation/catalog";
import { adjustStock } from "./inventory";

type ProductData = z.output<typeof productSchema>;

/**
 * Cria/atualiza produto, variantes e imagens em uma transação.
 * - Variantes removidas que já foram vendidas são DESATIVADAS (preserva histórico).
 * - Estoque inicial de variantes novas entra pelo livro-razão de estoque.
 */
export async function saveProduct(id: string | null, data: ProductData, actorId: string): Promise<{ id: string }> {
  if (data.categoryId) {
    const exists = await db.category.count({ where: { id: data.categoryId } });
    if (!exists) throw new ValidationError("Categoria inválida.");
  }

  try {
    return await db.$transaction(async (tx) => {
      const current = id ? await tx.product.findFirst({ where: { id, deletedAt: null }, include: { variants: { select: { id: true } } } }) : null;
      if (id && !current) throw new NotFoundError("Produto não encontrado.");

      const fields = {
        name: data.name,
        slug: data.slug,
        brand: data.brand,
        model: data.model,
        shortDescription: data.shortDescription,
        description: data.description,
        specs: data.specs as Prisma.InputJsonValue,
        status: data.status,
        isFeatured: data.isFeatured,
        categoryId: data.categoryId ?? null,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        publishedAt: data.status === "PUBLISHED" ? (current?.publishedAt ?? new Date()) : (current?.publishedAt ?? null),
      };

      const product = current ? await tx.product.update({ where: { id: current.id }, data: fields }) : await tx.product.create({ data: fields });

      // Variantes
      const ownIds = new Set(current?.variants.map((v) => v.id) ?? []);
      const keptIds = new Set<string>();
      for (const [index, v] of data.variants.entries()) {
        const variantFields = {
          sku: v.sku,
          name: v.name,
          color: v.color,
          colorHex: v.colorHex ?? null,
          lens: v.lens,
          size: v.size,
          priceCents: v.priceCents,
          salePriceCents: v.salePriceCents ?? null,
          weightGrams: v.weightGrams,
          isActive: v.isActive,
          sortOrder: index,
        };
        if (v.id) {
          // Só atualiza variantes deste produto (impede editar variante alheia por ID forjado).
          if (!ownIds.has(v.id)) throw new ValidationError("Variante inválida.");
          await tx.productVariant.update({ where: { id: v.id }, data: variantFields });
          keptIds.add(v.id);
        } else {
          const created = await tx.productVariant.create({ data: { ...variantFields, productId: product.id } });
          keptIds.add(created.id);
          if (v.initialStock && v.initialStock > 0) await adjustStock(tx, created.id, v.initialStock, "Estoque inicial", actorId);
        }
      }
      for (const removedId of [...ownIds].filter((x) => !keptIds.has(x))) {
        const sold = await tx.orderItem.count({ where: { variantId: removedId } });
        if (sold > 0) await tx.productVariant.update({ where: { id: removedId }, data: { isActive: false } });
        else {
          const v = await tx.productVariant.findUniqueOrThrow({ where: { id: removedId }, select: { reserved: true } });
          if (v.reserved > 0) throw new ConflictError("Não é possível remover uma variante com unidades reservadas.");
          await tx.productVariant.delete({ where: { id: removedId } });
        }
      }

      // Imagens (substitui na ordem informada)
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (data.images.length) {
        await tx.productImage.createMany({ data: data.images.map((img, i) => ({ productId: product.id, url: img.url, alt: img.alt, sortOrder: i })) });
      }
      return { id: product.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String((error.meta as { target?: unknown })?.target ?? "");
      throw new ConflictError(target.includes("sku") ? "Já existe uma variante com este SKU." : "Já existe um produto com este slug.", "DUPLICATE");
    }
    throw error;
  }
}

/** "Excluir" = arquivar (soft delete): preserva pedidos e histórico. */
export async function archiveProduct(id: string): Promise<void> {
  const p = await db.product.findFirst({ where: { id, deletedAt: null } });
  if (!p) throw new NotFoundError("Produto não encontrado.");
  await db.product.update({ where: { id }, data: { status: "ARCHIVED", deletedAt: new Date(), slug: `${p.slug}-arquivado-${Date.now()}`.slice(0, 180) } });
}
