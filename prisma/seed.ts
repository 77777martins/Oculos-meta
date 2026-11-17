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
    { slug: "meta-glasses", name: "Meta Glasses", description: "Óculos inteligentes da linha Meta Glasses.", sortOrder: 2 },
    { slug: "oakley-meta", name: "Oakley Meta", description: "Óculos inteligentes Oakley Meta para performance.", sortOrder: 2 },
    { slug: "acessorios", name: "Acessórios", description: "Estojos, lentes e acessórios.", sortOrder: 3 },
  ];
  for (const c of categories) await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });

  // Migra o banner padrão antigo (4:3) para a arte panorâmica do hero de tela cheia.
  // Só toca no banner que ainda aponta para a arte padrão antiga.
  await db.banner.updateMany({ where: { imageUrl: "/images/banners/hero-visio.webp" }, data: { imageUrl: "/images/banners/hero-visio-wide.webp" } });

  // Banner principal (arte original da marca). Só cria se a loja ainda não tiver banners —
  // nunca substitui o que o administrador cadastrar em Admin > Banners.
  if ((await db.banner.count()) === 0) {
    await db.banner.create({
      data: {
        title: "Veja o mundo de um jeito novo.",
        subtitle: "Óculos inteligentes com câmera, áudio aberto e assistente de voz. Compra segura, PIX e entrega rastreada para todo o Brasil.",
        imageUrl: "/images/banners/hero-visio-wide.webp",
        linkUrl: "/produtos",
        ctaLabel: "Explorar modelos",
        sortOrder: 0,
        isActive: true,
      },
    });
  }
}

async function demo() {
  const rb = await db.category.findUniqueOrThrow({ where: { slug: "ray-ban-meta" } });
  const ok = await db.category.findUniqueOrThrow({ where: { slug: "oakley-meta" } });
  const mg = await db.category.findUniqueOrThrow({ where: { slug: "meta-glasses" } });

  const products = [
    {
      slug: "demo-ray-ban-meta-wayfarer",
      name: "[DEMO] Ray-Ban Meta Wayfarer",
      model: "Wayfarer",
      categoryId: rb.id,
      isFeatured: true,
      variants: [
        { sku: "DEMO-RBW-PRETO", name: "Preto brilhante", color: "Preto", colorHex: "#111111", priceCents: 299900, salePriceCents: 279900, stock: 12 },
        { sku: "DEMO-RBW-AZUL", name: "Azul brilhante", color: "Azul", colorHex: "#1e2a5a", priceCents: 299900, salePriceCents: null, stock: 4 },
        { sku: "DEMO-RBW-FOSCO", name: "Preto fosco · lente polarizada", color: "Preto fosco", colorHex: "#2b2b2b", priceCents: 319900, salePriceCents: null, stock: 5 },
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
    {
      // Nome do modelo ainda não confirmado pelo lojista (não está legível nas fotos).
      slug: "demo-ray-ban-meta-piloto",
      name: "[DEMO] Ray-Ban Meta Piloto",
      model: "Piloto",
      categoryId: rb.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-RBP-TARTARUGA", name: "Tartaruga · lente marrom", color: "Tartaruga", colorHex: "#5b4226", priceCents: 319900, salePriceCents: null, stock: 5 }],
    },
    {
      slug: "demo-oakley-meta-vanguard",
      name: "[DEMO] Oakley Meta Vanguard",
      model: "Vanguard",
      categoryId: ok.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-OKV-PRETO", name: "Preto · lente dourada", color: "Preto", colorHex: "#1a1a1a", priceCents: 389900, salePriceCents: null, stock: 5 }],
    },
    {
      slug: "demo-meta-fury",
      name: "[DEMO] Meta Fury",
      model: "Fury",
      categoryId: mg.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-MFY-PRETO", name: "Preto · lente marrom degradê", color: "Preto", colorHex: "#111111", priceCents: 339900, salePriceCents: null, stock: 5 }],
    },
    {
      slug: "demo-meta-adventurer",
      name: "[DEMO] Meta Adventurer",
      model: "Adventurer",
      categoryId: mg.id,
      isFeatured: true,
      variants: [
        { sku: "DEMO-MAD-PRETO", name: "Preto", color: "Preto", colorHex: "#111111", priceCents: 329900, salePriceCents: null, stock: 5 },
        { sku: "DEMO-MAD-CINZA", name: "Cinza translúcido · lente rosa", color: "Cinza", colorHex: "#6b6b6b", priceCents: 339900, salePriceCents: null, stock: 5 },
      ],
    },
    {
      slug: "demo-meta-starfire",
      name: "[DEMO] Meta Starfire",
      model: "Starfire",
      categoryId: mg.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-MSF-PRETO", name: "Preto", color: "Preto", colorHex: "#111111", priceCents: 339900, salePriceCents: null, stock: 5 }],
    },
  ];

  for (const p of products) {
    const product =
      (await db.product.findUnique({ where: { slug: p.slug } })) ??
      (await db.product.create({
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
      }));
    // Cria só as variantes que ainda não existem (por SKU): não altera preço/estoque já ajustados no painel.
    for (const [i, v] of p.variants.entries()) {
      if (await db.productVariant.findUnique({ where: { sku: v.sku } })) continue;
      const variant = await db.productVariant.create({
        data: { productId: product.id, sku: v.sku, name: v.name, color: v.color, colorHex: v.colorHex, priceCents: v.priceCents, salePriceCents: v.salePriceCents, stock: v.stock, sortOrder: i },
      });
      await db.inventoryMovement.create({ data: { variantId: variant.id, type: "RESTOCK", quantity: v.stock, reason: "[DEMO] Estoque inicial do seed" } });
    }
  }
  // O Wayfarer azul do seed antigo chamava-se "Azul translúcido"; a foto real mostra azul brilhante.
  await db.productVariant.updateMany({ where: { sku: "DEMO-RBW-AZUL", name: "Azul translúcido" }, data: { name: "Azul brilhante", colorHex: "#1e2a5a" } });

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

interface DemoImage {
  url: string;
  alt: string;
  variantSku: string | null;
  credit?: string;
  creditUrl?: string;
  /** Mesma foto com a lente escurecida (efeito automático na vitrine). */
  sunUrl?: string;
}

const IMG = "/images/produtos";

/** Galeria padrão de um modelo: ¾, frente, ¾ oposto, costas e conteúdo da caixa. */
/** Galeria com lente que escurece: a capa é a foto de lente clara + a versão escurecida. */
function sunGallery(file: string, label: string, sku: string): DemoImage[] {
  const base = `${IMG}/${file}`;
  return [
    { url: `${base}-lente-clara.webp`, sunUrl: `${base}-lente-escurecida.webp`, alt: `${label} — lente que escurece no sol`, variantSku: sku },
    { url: `${base}-frente.webp`, alt: `${label} — vista frontal`, variantSku: sku },
    { url: `${base}-lateral.webp`, alt: `${label} — vista lateral`, variantSku: sku },
    { url: `${base}-costas.webp`, alt: `${label} — vista traseira`, variantSku: sku },
    { url: `${base}-caixa.webp`, alt: `${label} — conteúdo da embalagem`, variantSku: sku },
  ];
}

function gallery(file: string, label: string, sku: string): DemoImage[] {
  return [
    { url: `${IMG}/${file}-lateral-esquerda.webp`, alt: `${label} — vista lateral esquerda`, variantSku: sku },
    { url: `${IMG}/${file}-frente.webp`, alt: `${label} — vista frontal`, variantSku: sku },
    { url: `${IMG}/${file}-lateral-direita.webp`, alt: `${label} — vista lateral direita`, variantSku: sku },
    { url: `${IMG}/${file}-costas.webp`, alt: `${label} — vista traseira`, variantSku: sku },
    { url: `${IMG}/${file}-caixa.webp`, alt: `${label} — conteúdo da embalagem`, variantSku: sku },
  ];
}

/**
 * Fotos de produto fornecidas pelo fornecedor da loja (uso informado pelo lojista).
 * A primeira é a capa. `sunUrl` é a mesma foto com a lente escurecida.
 */
const DEMO_IMAGES: Record<string, DemoImage[]> = {
  "demo-ray-ban-meta-wayfarer": [
    ...sunGallery("ray-ban-meta-wayfarer-preto", "Ray-Ban Meta Wayfarer preto brilhante", "DEMO-RBW-PRETO"),
    ...sunGallery("ray-ban-meta-wayfarer-azul", "Ray-Ban Meta Wayfarer azul brilhante", "DEMO-RBW-AZUL"),
    ...gallery("ray-ban-meta-wayfarer-fosco", "Ray-Ban Meta Wayfarer preto fosco", "DEMO-RBW-FOSCO"),
  ],
  "demo-meta-adventurer": [
    ...gallery("meta-adventurer-preto", "Meta Adventurer preto", "DEMO-MAD-PRETO"),
    ...gallery("meta-adventurer-cinza", "Meta Adventurer cinza translúcido com lente rosa", "DEMO-MAD-CINZA"),
  ],
  "demo-ray-ban-meta-piloto": sunGallery("ray-ban-meta-piloto-tartaruga", "Ray-Ban Meta Piloto tartaruga", "DEMO-RBP-TARTARUGA"),
  "demo-oakley-meta-vanguard": gallery("oakley-meta-vanguard-preto", "Oakley Meta Vanguard preto com lente dourada", "DEMO-OKV-PRETO"),
  "demo-meta-fury": gallery("meta-fury-preto", "Meta Fury preto com lente marrom degradê", "DEMO-MFY-PRETO"),
  "demo-meta-starfire": gallery("meta-starfire-preto", "Meta Starfire preto", "DEMO-MSF-PRETO"),
};

/** Imagens que versões anteriores do seed cadastraram e que não existem mais. */
const LEGACY_DEMO_IMAGE_URLS = [`${IMG}/ray-ban-meta-wayfarer-gen1-preto.webp`];
const SEED_IMAGE_URLS = new Set([...LEGACY_DEMO_IMAGE_URLS, ...Object.values(DEMO_IMAGES).flatMap((list) => list.map((i) => i.url))]);

/**
 * Cadastra/atualiza a galeria de demonstração. Idempotente e conservador: só escreve quando
 * todas as imagens atuais do produto vieram do próprio seed — nunca troca fotos do administrador.
 */
async function syncDemoImages() {
  for (const [slug, images] of Object.entries(DEMO_IMAGES)) {
    const product = await db.product.findUnique({ where: { slug }, include: { variants: true, images: { orderBy: { sortOrder: "asc" }, select: { url: true } } } });
    if (!product) continue;
    if (!product.images.every((i) => SEED_IMAGE_URLS.has(i.url))) continue;
    const current = product.images.map((i) => i.url).join("|");
    if (current === images.map((i) => i.url).join("|")) continue;
    await db.$transaction([
      db.productImage.deleteMany({ where: { productId: product.id } }),
      db.productImage.createMany({
        data: images.map((img, i) => ({
          productId: product.id,
          variantId: img.variantSku ? (product.variants.find((v) => v.sku === img.variantSku)?.id ?? null) : null,
          url: img.url,
          alt: img.alt,
          credit: img.credit ?? null,
          creditUrl: img.creditUrl ?? null,
          sunUrl: img.sunUrl ?? null,
          sortOrder: i,
        })),
      }),
    ]);
  }
}

async function main() {
  await base();
  if (process.env.SEED_DEMO === "true") {
    // Em produção, só em implantação explicitamente marcada como demonstração (exibe aviso no site).
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") throw new Error("Dados de demonstração exigem DEMO_MODE=true em produção.");
    await demo();
    await syncDemoImages();
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
