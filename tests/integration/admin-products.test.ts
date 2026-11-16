import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { productSchema, type ProductInput } from "@/lib/validation/catalog";
import { saveProduct } from "@/server/services/admin-products";
import { getProductBySlug } from "@/server/services/catalog";
import { createUser, resetDb } from "../helpers/db";

beforeEach(resetDb);

const base = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: "Óculos Teste",
  slug: "oculos-teste",
  brand: "Meta",
  model: "T1",
  description: "Descrição completa do produto de teste.",
  specs: [],
  status: "PUBLISHED",
  isFeatured: false,
  variants: [
    { sku: "T1-PRETO", name: "Preto", priceCents: 1000_00, weightGrams: 300, isActive: true, initialStock: 5 },
    { sku: "T1-AZUL", name: "Azul", priceCents: 1000_00, weightGrams: 300, isActive: true, initialStock: 5 },
  ],
  images: [
    { url: "https://cdn.exemplo.com/geral.jpg", alt: "Foto geral" },
    { url: "https://cdn.exemplo.com/azul.jpg", alt: "Foto azul", variantSku: "t1-azul" },
  ],
  ...over,
});

describe("imagens por variante", () => {
  it("vincula a imagem à variante NOVA pelo SKU e a vitrine recebe o vínculo", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { id } = await saveProduct(null, productSchema.parse(base()), admin.id);
    const images = await db.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" }, include: { variant: { select: { sku: true } } } });
    expect(images.map((i) => [i.alt, i.variant?.sku ?? null])).toEqual([
      ["Foto geral", null],
      ["Foto azul", "T1-AZUL"],
    ]);
    const product = await getProductBySlug("oculos-teste");
    const azul = product!.variants.find((v) => v.sku === "T1-AZUL")!;
    expect(product!.images.find((i) => i.alt === "Foto azul")!.variantId).toBe(azul.id);
  });

  it("mantém o vínculo ao editar e permite trocar a variante", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { id } = await saveProduct(null, productSchema.parse(base()), admin.id);
    const variants = await db.productVariant.findMany({ where: { productId: id } });
    const edited = base({
      variants: variants.map((v) => ({ id: v.id, sku: v.sku, name: v.name, priceCents: v.priceCents, weightGrams: v.weightGrams, isActive: true })),
      images: [{ url: "https://cdn.exemplo.com/azul.jpg", alt: "Agora preto", variantSku: "T1-PRETO" }],
    });
    await saveProduct(id, productSchema.parse(edited), admin.id);
    const img = await db.productImage.findFirstOrThrow({ where: { productId: id }, include: { variant: true } });
    expect(img.variant?.sku).toBe("T1-PRETO");
  });

  it("recusa SKU que não pertence ao produto", () => {
    const r = productSchema.safeParse(base({ images: [{ url: "https://cdn.exemplo.com/x.jpg", alt: "X", variantSku: "OUTRO-SKU" }] }));
    expect(r.success).toBe(false);
  });
});
