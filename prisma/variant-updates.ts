/**
 * Atualização de cores (variantes) pedida pelo lojista em 18/11/2026.
 * Preços e quantidades são FICTÍCIOS (dados de teste), limitados a R$ 300,00.
 *
 * Só as cores que já existiam, têm foto e batem com a lista foram atualizadas.
 * As demais linhas da lista ficam em PENDING_VARIANTS até chegarem fotos/confirmação
 * (não são criadas para não vender cor sem foto nem inventar versões).
 *
 * `lens: null` = cor da lente ainda não confirmada (editável no painel).
 */
export interface VariantUpdate {
  fromSku: string;
  sku: string;
  name: string;
  color: string;
  lens: string | null;
  priceCents: number;
  stock: number;
}

export const MAX_TEST_PRICE_CENTS = 300_00;

export const VARIANT_UPDATES: VariantUpdate[] = [
  { fromSku: "DEMO-RBC-PRETO", sku: "META-CLB-01", name: "Preto/Dourado", color: "Preto/Dourado", lens: null, priceCents: 249_90, stock: 8 },
  { fromSku: "DEMO-RBR-TRANSLUCIDO", sku: "META-RET-01", name: "Preto", color: "Preto", lens: "Transparente", priceCents: 149_90, stock: 12 },
  { fromSku: "DEMO-RBG-PRETO", sku: "META-ZEN-01", name: "Preto", color: "Preto", lens: null, priceCents: 269_90, stock: 5 },
  { fromSku: "DEMO-RBS-PRETO", sku: "META-SKY-01", name: "Preto", color: "Preto", lens: null, priceCents: 299_90, stock: 3 },
  { fromSku: "DEMO-RBW-PRETO", sku: "META-WAY-01", name: "Preto", color: "Preto", lens: null, priceCents: 279_90, stock: 7 },
];

/** Linhas da lista ainda NÃO cadastradas (sem foto da cor ou sem correspondência no catálogo). */
export const PENDING_VARIANTS = [
  { sku: "META-CLB-02", product: "Ray-Ban Meta Audio Clubmaster", color: "Tartaruga/Dourado", priceCents: 279_90, stock: 4, reason: "sem foto da cor" },
  { sku: "META-RET-02", product: "Ray-Ban Meta Blayzer Optics (Gen 2)", color: "Transparente", priceCents: 179_90, stock: 5, reason: "sem foto da cor" },
  { sku: "META-PIL-01", product: "Ray-Ban Meta Aviator (Gen 3)", color: "Preto", priceCents: 169_90, stock: 9, reason: "sem foto da cor (a única cor com foto é Havana)" },
  { sku: "META-PIL-02", product: "Ray-Ban Meta Aviator (Gen 3)", color: "Prata", priceCents: 199_90, stock: 2, reason: "sem foto da cor (a única cor com foto é Havana)" },
  { sku: "META-ZEN-02", product: "Ray-Ban Meta Zena (Gen 3)", color: "Marrom", priceCents: 289_90, stock: 4, reason: "sem foto da cor" },
  { sku: "META-SKY-02", product: "Ray-Ban Meta Skyler", color: "Caramelo", priceCents: 299_90, stock: 2, reason: "sem foto da cor" },
  { sku: "META-WAY-02", product: "Ray-Ban Meta Wayfarer", color: "Tartaruga", priceCents: 299_90, stock: 4, reason: "sem foto da cor" },
] as const;

/** Linhas descartadas por decisão do lojista: "Gatinho" e "Zena" são o mesmo produto (vale META-ZEN). */
export const DISCARDED_SKUS = ["META-GAT-01", "META-GAT-02"] as const;
