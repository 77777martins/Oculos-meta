import { z } from "zod";
import { centsSchema, cleanText, idSchema, longText, optionalText, safeUrlSchema, slugSchema } from "./common";

export const specSchema = z.strictObject({ label: cleanText(60), value: cleanText(300) });

export const variantSchema = z
  .strictObject({
    id: idSchema.optional(),
    sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{1,63}$/, "SKU: letras, números, - e _."),
    name: cleanText(120),
    color: optionalText(60),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (#RRGGBB).").optional().nullable(),
    lens: optionalText(80),
    size: optionalText(40),
    priceCents: centsSchema.min(1, "Preço obrigatório."),
    salePriceCents: centsSchema.min(1).optional().nullable(),
    weightGrams: z.number().int().min(1).max(30_000),
    isActive: z.boolean(),
    /** Somente para variantes NOVAS. Alterações posteriores usam ajuste de estoque (livro-razão). */
    initialStock: z.number().int().min(0).max(100_000).optional(),
  })
  .refine((v) => v.salePriceCents == null || v.salePriceCents < v.priceCents, {
    message: "O preço promocional deve ser menor que o preço normal.",
    path: ["salePriceCents"],
  });

export const productImageSchema = z.strictObject({
  url: safeUrlSchema,
  alt: cleanText(200),
  /** Imagem específica de uma variante (por SKU). Vazio = imagem geral do produto. */
  variantSku: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .transform((v) => v || null),
  /** Crédito/licença da imagem (obrigatório por licenças como CC BY). */
  credit: optionalText(300),
  creditUrl: safeUrlSchema.optional().nullable().or(z.literal("").transform(() => null)),
  /** Mesma foto com a lente escurecida (efeito automático de lente fotocromática). */
  sunUrl: safeUrlSchema.optional().nullable().or(z.literal("").transform(() => null)),
});

export const productSchema = z.strictObject({
  name: cleanText(160, 2),
  slug: slugSchema,
  brand: cleanText(80),
  model: cleanText(120),
  shortDescription: optionalText(300),
  description: longText(10_000, 10),
  specs: z.array(specSchema).max(40),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
  categoryId: idSchema.optional().nullable(),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
  variants: z
    .array(variantSchema)
    .min(1, "Cadastre pelo menos uma variante.")
    .max(50)
    .refine((vs) => new Set(vs.map((v) => v.sku)).size === vs.length, "SKUs repetidos."),
  images: z.array(productImageSchema).max(20),
}).refine((p) => p.images.every((img) => !img.variantSku || p.variants.some((v) => v.sku === img.variantSku)), {
  message: "Uma imagem está vinculada a um SKU que não existe neste produto.",
  path: ["images"],
});

export const stockAdjustmentSchema = z.strictObject({
  variantId: idSchema,
  /** Variação: positiva para entrada, negativa para baixa. */
  delta: z.number().int().min(-100_000).max(100_000).refine((v) => v !== 0, "Informe uma quantidade diferente de zero."),
  reason: cleanText(300, 3),
});

export const categorySchema = z.strictObject({
  name: cleanText(80, 2),
  slug: slugSchema,
  description: optionalText(500),
  imageUrl: safeUrlSchema.optional().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  categoria: z.string().regex(/^[a-z0-9-]{1,100}$/).optional().catch(undefined),
  ordem: z.enum(["relevancia", "menor-preco", "maior-preco", "novidades"]).catch("relevancia"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
  min: z.coerce.number().int().min(0).max(1_000_000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(1_000_000).optional().catch(undefined),
});

export type ProductInput = z.input<typeof productSchema>;
export type VariantInput = z.input<typeof variantSchema>;

/** Edição em massa de preço e estoque (Admin > Preços e estoque). */
export const bulkVariantUpdateSchema = z.strictObject({
  reason: cleanText(200, 3),
  items: z
    .array(
      z
        .strictObject({
          variantId: idSchema,
          priceCents: centsSchema.min(1, "Preço obrigatório."),
          salePriceCents: centsSchema.min(1).nullable(),
          /** Estoque físico desejado: vira um ajuste no livro-razão (diferença para o atual). */
          stock: z.number().int().min(0).max(100_000),
          /** Variante à venda na loja (desativada some da vitrine; nada é apagado). */
          isActive: z.boolean(),
        })
        .refine((v) => v.salePriceCents == null || v.salePriceCents < v.priceCents, {
          message: "O preço promocional deve ser menor que o preço normal.",
          path: ["salePriceCents"],
        }),
    )
    .min(1)
    .max(500),
});
