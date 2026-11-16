/**
 * Seed do banco.
 * - BASE (sempre): configurações da loja e categorias iniciais (editáveis no painel).
 * - DEMONSTRAÇÃO (somente com SEED_DEMO=true e fora de produção): produtos e
 *   frete identificados com "[DEMO]". Preços são FICTÍCIOS e NÃO há
 *   especificações técnicas inventadas — cadastre os dados reais no painel.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function base() {
  await db.storeSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const categories = [
    { slug: "ray-ban-meta", name: "Ray-Ban Meta", description: "Óculos inteligentes Ray-Ban Meta.", sortOrder: 1 },
    { slug: "oakley-meta", name: "Oakley Meta", description: "Óculos inteligentes Oakley Meta para performance.", sortOrder: 2 },
    { slug: "acessorios", name: "Acessórios", description: "Estojos, lentes e acessórios.", sortOrder: 3 },
  ];
  for (const c of categories) await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
}

async function demo() {
  const rb = await db.category.findUniqueOrThrow({ where: { slug: "ray-ban-meta" } });
  const ok = await db.category.findUniqueOrThrow({ where: { slug: "oakley-meta" } });

  const products = [
    {
      slug: "demo-ray-ban-meta-wayfarer",
      name: "[DEMO] Ray-Ban Meta Wayfarer",
      model: "Wayfarer",
      categoryId: rb.id,
      isFeatured: true,
      variants: [
        { sku: "DEMO-RBW-PRETO", name: "Preto brilhante", color: "Preto", colorHex: "#111111", priceCents: 299900, salePriceCents: 279900, stock: 12 },
        { sku: "DEMO-RBW-AZUL", name: "Azul translúcido", color: "Azul", colorHex: "#1e3a8a", priceCents: 299900, salePriceCents: null, stock: 4 },
      ],
    },
    {
      slug: "demo-ray-ban-meta-skyler",
      name: "[DEMO] Ray-Ban Meta Skyler",
      model: "Skyler",
      categoryId: rb.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-RBS-PRETO", name: "Preto", color: "Preto", colorHex: "#1f2937", priceCents: 319900, salePriceCents: null, stock: 6 }],
    },
    {
      slug: "demo-oakley-meta-hstn",
      name: "[DEMO] Oakley Meta HSTN",
      model: "HSTN",
      categoryId: ok.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-OKH-PRETO", name: "Preto fosco", color: "Preto", colorHex: "#0f172a", priceCents: 349900, salePriceCents: null, stock: 2 }],
    },
  ];

  for (const p of products) {
    const exists = await db.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    const product = await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        model: p.model,
        categoryId: p.categoryId,
        isFeatured: p.isFeatured,
        status: "PUBLISHED",
        publishedAt: new Date(),
        shortDescription: "Produto de DEMONSTRAÇÃO para testes em ambiente de desenvolvimento. Preço fictício.",
        description:
          "Este é um produto de demonstração criado pelo seed de desenvolvimento.\n\nSubstitua por dados oficiais e verificados no painel administrativo antes de operar em produção. Nenhuma especificação técnica foi cadastrada propositalmente.",
        specs: [],
      },
    });
    for (const [i, v] of p.variants.entries()) {
      const variant = await db.productVariant.create({
        data: { productId: product.id, sku: v.sku, name: v.name, color: v.color, colorHex: v.colorHex, priceCents: v.priceCents, salePriceCents: v.salePriceCents, stock: v.stock, sortOrder: i },
      });
      await db.inventoryMovement.create({ data: { variantId: variant.id, type: "RESTOCK", quantity: v.stock, reason: "[DEMO] Estoque inicial do seed" } });
    }
  }

  if ((await db.shippingZone.count()) === 0) {
    await db.shippingZone.createMany({
      data: [
        { name: "[DEMO] Brasil", carrier: "Correios", serviceName: "PAC", zipStart: 1000000, zipEnd: 99999999, priceCents: 2990, freeAboveCents: 300000, minDays: 5, maxDays: 12 },
        { name: "[DEMO] Brasil", carrier: "Correios", serviceName: "SEDEX", zipStart: 1000000, zipEnd: 99999999, priceCents: 5990, freeAboveCents: null, minDays: 2, maxDays: 6 },
      ],
    });
  }

  if ((await db.coupon.count()) === 0) {
    await db.coupon.create({ data: { code: "DEMO10", description: "[DEMO] 10% de desconto", type: "PERCENT", value: 1000, maxPerUser: 5 } });
  }
}

async function main() {
  await base();
  if (process.env.SEED_DEMO === "true") {
    // Em produção, só em implantação explicitamente marcada como demonstração (exibe aviso no site).
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") throw new Error("Dados de demonstração exigem DEMO_MODE=true em produção.");
    await demo();
    console.log("Seed base + DEMONSTRAÇÃO concluído.");
  } else {
    console.log("Seed base concluído (use SEED_DEMO=true para dados de demonstração em desenvolvimento).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
