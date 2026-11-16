/**
 * Regras PURAS de preço, desconto e frete.
 * Sem acesso a banco: recebem dados já carregados do servidor e são
 * cobertas por testes unitários. Nunca recebem preços vindos do cliente.
 */
import type { CouponType } from "@prisma/client";

export interface CouponRule {
  code: string;
  type: CouponType;
  value: number;
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  deletedAt: Date | null;
}

export type CouponEvaluation = { ok: true } | { ok: false; reason: string };

export function evaluateCoupon(
  coupon: CouponRule,
  ctx: { subtotalCents: number; now: Date; totalRedemptions: number; userRedemptions: number | null },
): CouponEvaluation {
  if (!coupon.isActive || coupon.deletedAt) return { ok: false, reason: "Cupom inválido ou inativo." };
  if (coupon.startsAt && ctx.now < coupon.startsAt) return { ok: false, reason: "Este cupom ainda não está válido." };
  if (coupon.endsAt && ctx.now > coupon.endsAt) return { ok: false, reason: "Este cupom expirou." };
  if (coupon.maxRedemptions !== null && ctx.totalRedemptions >= coupon.maxRedemptions) return { ok: false, reason: "Este cupom atingiu o limite de usos." };
  if (coupon.maxPerUser !== null && ctx.userRedemptions !== null && ctx.userRedemptions >= coupon.maxPerUser)
    return { ok: false, reason: "Você já utilizou este cupom." };
  if (ctx.subtotalCents < coupon.minSubtotalCents) return { ok: false, reason: "Subtotal abaixo do mínimo exigido para este cupom." };
  return { ok: true };
}

/** Desconto sobre o subtotal dos produtos (nunca maior que o subtotal). */
export function computeCouponDiscount(coupon: Pick<CouponRule, "type" | "value" | "maxDiscountCents">, subtotalCents: number): number {
  let discount = 0;
  if (coupon.type === "PERCENT") discount = Math.floor((subtotalCents * coupon.value) / 10_000);
  else if (coupon.type === "FIXED") discount = coupon.value;
  if (coupon.maxDiscountCents !== null && coupon.maxDiscountCents !== undefined) discount = Math.min(discount, coupon.maxDiscountCents);
  return Math.max(0, Math.min(discount, subtotalCents));
}

export interface ShippingZoneRule {
  id: string;
  name: string;
  carrier: string;
  serviceName: string;
  zipStart: number;
  zipEnd: number;
  priceCents: number;
  freeAboveCents: number | null;
  minDays: number;
  maxDays: number;
  isActive: boolean;
}

export interface ShippingOption {
  id: string;
  name: string;
  carrier: string;
  serviceName: string;
  priceCents: number;
  minDays: number;
  maxDays: number;
  isFree: boolean;
}

export function shippingOptionsForZip(zones: ShippingZoneRule[], zipCode: string, subtotalCents: number): ShippingOption[] {
  const zip = Number(zipCode);
  if (!Number.isInteger(zip) || zipCode.length !== 8) return [];
  return zones
    .filter((z) => z.isActive && zip >= z.zipStart && zip <= z.zipEnd)
    .map((z) => {
      const isFree = z.freeAboveCents !== null && subtotalCents >= z.freeAboveCents;
      return {
        id: z.id,
        name: z.name,
        carrier: z.carrier,
        serviceName: z.serviceName,
        priceCents: isFree ? 0 : z.priceCents,
        minDays: z.minDays,
        maxDays: z.maxDays,
        isFree,
      };
    })
    .sort((a, b) => a.priceCents - b.priceCents || a.maxDays - b.maxDays);
}

export interface PricedLine {
  variantId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

export function computeTotals(input: {
  lines: PricedLine[];
  coupon?: Pick<CouponRule, "type" | "value" | "maxDiscountCents"> | null;
  shippingCents?: number | null;
}): Totals {
  const subtotalCents = input.lines.reduce((acc, l) => {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0 || !Number.isInteger(l.unitPriceCents) || l.unitPriceCents < 0) {
      throw new Error("Linha de pedido inválida.");
    }
    return acc + l.unitPriceCents * l.quantity;
  }, 0);
  const discountCents = input.coupon ? computeCouponDiscount(input.coupon, subtotalCents) : 0;
  const shippingCents = input.coupon?.type === "FREE_SHIPPING" ? 0 : Math.max(0, input.shippingCents ?? 0);
  return { subtotalCents, discountCents, shippingCents, totalCents: subtotalCents - discountCents + shippingCents };
}

/** Une linhas repetidas da mesma variante (o cliente pode enviar duplicadas). */
export function mergeCartLines<T extends { variantId: string; quantity: number }>(items: T[]): Array<{ variantId: string; quantity: number }> {
  const map = new Map<string, number>();
  for (const it of items) map.set(it.variantId, (map.get(it.variantId) ?? 0) + it.quantity);
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Parcelas sem juros oferecidas na vitrine (informativo; o Mercado Pago define as condições reais). */
export function installmentPreview(totalCents: number, maxInstallments: number, minInstallmentCents = 5000): { count: number; valueCents: number } {
  const count = Math.max(1, Math.min(maxInstallments, Math.floor(totalCents / minInstallmentCents)));
  return { count, valueCents: Math.ceil(totalCents / count) };
}
