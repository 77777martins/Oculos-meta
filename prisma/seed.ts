/**
 * Seed do banco.
 * - BASE (sempre): configurações da loja e categorias iniciais (editáveis no painel).
 * - DEMONSTRAÇÃO (somente com SEED_DEMO=true e fora de produção): produtos e
 *   frete identificados com "[DEMO]". Preços e estoques são FICTÍCIOS.
 *   Descrições e especificações vêm de prisma/catalog-content.ts (dados do lojista).
 */
import { PrismaClient } from "@prisma/client";
import { CATALOG_CONTENT, DEMO_PLACEHOLDER_PREFIX, LEGACY_DEMO_NAMES } from "./catalog-content";

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

  // Troca as artes padrão antigas (ilustrações) pela foto de campanha enviada pelo lojista.
  // Só toca em banners que ainda apontam para uma arte padrão — nunca nos cadastrados no painel.
  await db.banner.updateMany({
    where: { imageUrl: { in: ["/images/banners/hero-visio.webp", "/images/banners/hero-visio-wide.webp"] } },
    data: { imageUrl: "/images/banners/hero-campanha.webp" },
  });

  // Banner principal (arte original da marca). Só cria se a loja ainda não tiver banners —
  // nunca substitui o que o administrador cadastrar em Admin > Banners.
  if ((await db.banner.count()) === 0) {
    await db.banner.create({
      data: {
        title: "Veja o mundo de um jeito novo.",
        subtitle: "Óculos inteligentes com câmera, áudio aberto e assistente de voz. Compra segura, PIX e entrega rastreada para todo o Brasil.",
        imageUrl: "/images/banners/hero-campanha.webp",
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
      // Nome do modelo ainda não confirmado pelo lojista (não está legível nas fotos).
      slug: "demo-ray-ban-meta-gatinho",
      name: "[DEMO] Ray-Ban Meta Gatinho",
      model: "Gatinho",
      categoryId: rb.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-RBG-PRETO", name: "Preto brilhante", color: "Preto", colorHex: "#111111", priceCents: 319900, salePriceCents: null, stock: 5 }],
    },
    {
      // Nome do modelo ainda não confirmado pelo lojista (não está legível nas fotos).
      slug: "demo-ray-ban-meta-retangular",
      name: "[DEMO] Ray-Ban Meta Retangular",
      model: "Retangular",
      categoryId: rb.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-RBR-TRANSLUCIDO", name: "Preto translúcido · lente transparente", color: "Preto translúcido", colorHex: "#2a2a2a", priceCents: 349900, salePriceCents: null, stock: 5 }],
    },
    {
      slug: "demo-ray-ban-meta-clubmaster",
      name: "[DEMO] Ray-Ban Meta Clubmaster",
      model: "Clubmaster",
      categoryId: rb.id,
      isFeatured: true,
      variants: [{ sku: "DEMO-RBC-PRETO", name: "Preto e dourado", color: "Preto", colorHex: "#111111", priceCents: 329900, salePriceCents: null, stock: 5 }],
    },
    {
      slug: "demo-meta-capri",
      name: "[DEMO] Meta Capri",
      model: "Capri",
      categoryId: mg.id,
      isFeatured: true,
      variants: [
        { sku: "DEMO-MCP-TARTARUGA", name: "Tartaruga · lente transparente", color: "Tartaruga", colorHex: "#6b4a2b", priceCents: 329900, salePriceCents: null, stock: 5 },
        { sku: "DEMO-MCP-CINZA", name: "Cinza translúcido · lente escura", color: "Cinza", colorHex: "#4a4a4a", priceCents: 339900, salePriceCents: null, stock: 5 },
      ],
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
  // Marca exibida no cartão: versões antigas do seed deixavam todos como "Meta" (padrão do banco).
  for (const [categoryId, brand] of [[rb.id, "Ray-Ban Meta"], [ok.id, "Oakley Meta"]] as const) {
    await db.product.updateMany({ where: { slug: { startsWith: "demo-" }, categoryId, brand: "Meta" }, data: { brand } });
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

const VIEW_LABELS = {
  "lateral-esquerda": "vista lateral esquerda",
  frente: "vista frontal",
  "lateral-direita": "vista lateral direita",
  costas: "vista traseira",
  caixa: "conteúdo da embalagem",
} as const;
type View = keyof typeof VIEW_LABELS;
const ALL_VIEWS = Object.keys(VIEW_LABELS) as View[];

/** Galeria padrão de um modelo; `views` permite omitir ângulos que o fornecedor não enviou. */
function gallery(file: string, label: string, sku: string, views: View[] = ALL_VIEWS): DemoImage[] {
  return views.map((view) => ({ url: `${IMG}/${file}-${view}.webp`, alt: `${label} — ${VIEW_LABELS[view]}`, variantSku: sku }));
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
  "demo-ray-ban-meta-skyler": gallery("ray-ban-meta-skyler-preto", "Ray-Ban Meta Skyler preto com lente verde", "DEMO-RBS-PRETO"),
  "demo-ray-ban-meta-gatinho": sunGallery("ray-ban-meta-gatinho-preto", "Ray-Ban Meta Gatinho preto brilhante", "DEMO-RBG-PRETO"),
  "demo-oakley-meta-hstn": [
    {
      url: `${IMG}/oakley-meta-hstn-preto-lente-clara.webp`,
      sunUrl: `${IMG}/oakley-meta-hstn-preto-lente-escurecida.webp`,
      alt: "Oakley Meta HSTN preto fosco — lente que escurece no sol",
      variantSku: "DEMO-OKH-PRETO",
    },
    { url: `${IMG}/oakley-meta-hstn-preto-frente.webp`, alt: "Oakley Meta HSTN preto fosco — vista frontal", variantSku: "DEMO-OKH-PRETO" },
    { url: `${IMG}/oakley-meta-hstn-preto-frente-inclinada.webp`, alt: "Oakley Meta HSTN preto fosco — vista frontal inclinada", variantSku: "DEMO-OKH-PRETO" },
    { url: `${IMG}/oakley-meta-hstn-preto-costas.webp`, alt: "Oakley Meta HSTN preto fosco — vista traseira", variantSku: "DEMO-OKH-PRETO" },
    { url: `${IMG}/oakley-meta-hstn-preto-caixa.webp`, alt: "Oakley Meta HSTN preto fosco — conteúdo da embalagem", variantSku: "DEMO-OKH-PRETO" },
  ],
  "demo-ray-ban-meta-retangular": gallery("ray-ban-meta-retangular-preto-translucido", "Ray-Ban Meta Retangular preto translúcido", "DEMO-RBR-TRANSLUCIDO"),
  "demo-ray-ban-meta-clubmaster": sunGallery("ray-ban-meta-clubmaster-preto", "Ray-Ban Meta Clubmaster preto e dourado", "DEMO-RBC-PRETO"),
  "demo-meta-capri": [
    ...gallery("meta-capri-tartaruga", "Meta Capri tartaruga com lente transparente", "DEMO-MCP-TARTARUGA", ["lateral-esquerda", "frente", "lateral-direita", "caixa"]),
    ...gallery("meta-capri-cinza", "Meta Capri cinza translúcido com lente escura", "DEMO-MCP-CINZA", ["lateral-esquerda", "frente", "lateral-direita", "caixa"]),
  ],
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

/**
 * Aplica o conteúdo comercial (prisma/catalog-content.ts) aos produtos de demonstração.
 * Conservador: só atualiza produtos cuja descrição ainda é o texto provisório do seed, e só
 * troca o nome se ainda for o nome antigo do seed — nunca sobrescreve edições do painel.
 * Não toca em preço, estoque, variantes, imagens, slug nem status.
 */
async function syncCatalogContent() {
  for (const [slug, c] of Object.entries(CATALOG_CONTENT)) {
    const product = await db.product.findUnique({ where: { slug }, select: { id: true, name: true, description: true } });
    if (!product || !product.description.startsWith(DEMO_PLACEHOLDER_PREFIX)) continue;
    const renameFrom = LEGACY_DEMO_NAMES[slug];
    await db.product.update({
      where: { id: product.id },
      data: {
        ...(renameFrom && product.name === renameFrom ? { name: c.name } : {}),
        shortDescription: c.shortDescription,
        description: c.description,
        specs: c.specs,
        seoTitle: c.seoTitle,
        seoDescription: c.seoDescription,
      },
    });
  }
}

async function main() {
  await base();
  if (process.env.SEED_DEMO === "true") {
    // Em produção, só em implantação explicitamente marcada como demonstração (exibe aviso no site).
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") throw new Error("Dados de demonstração exigem DEMO_MODE=true em produção.");
    await demo();
    await syncDemoImages();
    await syncCatalogContent();
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
