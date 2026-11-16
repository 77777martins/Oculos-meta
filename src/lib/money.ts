/** Utilitários monetários. Todos os valores trafegam como centavos inteiros. */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Converte "1.234,56" / "1234.56" / "1234" (reais) em centavos inteiros. */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Reais com 2 casas, usado ao enviar valores para o provedor de pagamento. */
export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}

export function decimalToCents(value: number): number {
  return Math.round(value * 100);
}

/** Preço efetivo da variante: promocional quando válido, senão o preço cheio. */
export function effectivePriceCents(variant: { priceCents: number; salePriceCents: number | null }): number {
  return variant.salePriceCents !== null && variant.salePriceCents > 0 && variant.salePriceCents < variant.priceCents
    ? variant.salePriceCents
    : variant.priceCents;
}

export function discountPercent(variant: { priceCents: number; salePriceCents: number | null }): number {
  const eff = effectivePriceCents(variant);
  if (eff >= variant.priceCents) return 0;
  return Math.round(((variant.priceCents - eff) / variant.priceCents) * 100);
}
