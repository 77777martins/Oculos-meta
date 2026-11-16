import { describe, expect, it } from "vitest";
import { computeCouponDiscount, computeTotals, evaluateCoupon, installmentPreview, mergeCartLines, shippingOptionsForZip, type CouponRule } from "@/server/services/pricing";

const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  code: "OFF10",
  type: "PERCENT",
  value: 1000,
  minSubtotalCents: 0,
  maxDiscountCents: null,
  startsAt: null,
  endsAt: null,
  maxRedemptions: null,
  maxPerUser: null,
  isActive: true,
  deletedAt: null,
  ...over,
});
const ctx = { subtotalCents: 100_00, now: new Date("2026-06-01T12:00:00Z"), totalRedemptions: 0, userRedemptions: 0 };

describe("computeTotals", () => {
  it("soma linhas em centavos e aplica frete", () => {
    const t = computeTotals({ lines: [{ variantId: "a", quantity: 2, unitPriceCents: 199_90 }, { variantId: "b", quantity: 1, unitPriceCents: 50_05 }], shippingCents: 29_90 });
    expect(t).toEqual({ subtotalCents: 449_85, discountCents: 0, shippingCents: 29_90, totalCents: 479_75 });
  });

  it("cupom percentual arredonda para baixo (nunca desconta a mais)", () => {
    const t = computeTotals({ lines: [{ variantId: "a", quantity: 1, unitPriceCents: 333 }], coupon: coupon({ value: 1000 }) });
    expect(t.discountCents).toBe(33);
    expect(t.totalCents).toBe(300);
  });

  it("cupom de frete grátis zera apenas o frete", () => {
    const t = computeTotals({ lines: [{ variantId: "a", quantity: 1, unitPriceCents: 100_00 }], coupon: coupon({ type: "FREE_SHIPPING", value: 0 }), shippingCents: 30_00 });
    expect(t).toMatchObject({ discountCents: 0, shippingCents: 0, totalCents: 100_00 });
  });

  it("rejeita quantidades ou preços inválidos", () => {
    expect(() => computeTotals({ lines: [{ variantId: "a", quantity: 0, unitPriceCents: 100 }] })).toThrow();
    expect(() => computeTotals({ lines: [{ variantId: "a", quantity: 1, unitPriceCents: -1 }] })).toThrow();
    expect(() => computeTotals({ lines: [{ variantId: "a", quantity: 1.5, unitPriceCents: 100 }] })).toThrow();
  });
});

describe("computeCouponDiscount", () => {
  it("respeita o teto de desconto", () => {
    expect(computeCouponDiscount({ type: "PERCENT", value: 5000, maxDiscountCents: 20_00 }, 100_00)).toBe(20_00);
  });
  it("desconto fixo nunca excede o subtotal", () => {
    expect(computeCouponDiscount({ type: "FIXED", value: 500_00, maxDiscountCents: null }, 100_00)).toBe(100_00);
  });
});

describe("evaluateCoupon", () => {
  it("aceita cupom válido", () => expect(evaluateCoupon(coupon(), ctx)).toEqual({ ok: true }));
  it("rejeita inativo, excluído, fora da validade", () => {
    expect(evaluateCoupon(coupon({ isActive: false }), ctx).ok).toBe(false);
    expect(evaluateCoupon(coupon({ deletedAt: new Date() }), ctx).ok).toBe(false);
    expect(evaluateCoupon(coupon({ startsAt: new Date("2026-07-01") }), ctx).ok).toBe(false);
    expect(evaluateCoupon(coupon({ endsAt: new Date("2026-05-01") }), ctx).ok).toBe(false);
  });
  it("rejeita limite total, por usuário e subtotal mínimo", () => {
    expect(evaluateCoupon(coupon({ maxRedemptions: 5 }), { ...ctx, totalRedemptions: 5 }).ok).toBe(false);
    expect(evaluateCoupon(coupon({ maxPerUser: 1 }), { ...ctx, userRedemptions: 1 }).ok).toBe(false);
    expect(evaluateCoupon(coupon({ minSubtotalCents: 200_00 }), ctx).ok).toBe(false);
  });
});

describe("shippingOptionsForZip", () => {
  const zones = [
    { id: "pac", name: "BR", carrier: "Correios", serviceName: "PAC", zipStart: 1000000, zipEnd: 99999999, priceCents: 30_00, freeAboveCents: 500_00, minDays: 5, maxDays: 10, isActive: true },
    { id: "sedex", name: "BR", carrier: "Correios", serviceName: "SEDEX", zipStart: 1000000, zipEnd: 99999999, priceCents: 60_00, freeAboveCents: null, minDays: 1, maxDays: 3, isActive: true },
    { id: "off", name: "BR", carrier: "X", serviceName: "Y", zipStart: 0, zipEnd: 99999999, priceCents: 1, freeAboveCents: null, minDays: 1, maxDays: 1, isActive: false },
  ];
  it("filtra por faixa e ignora zonas inativas, ordenando por preço", () => {
    expect(shippingOptionsForZip(zones, "01310100", 100_00).map((o) => o.id)).toEqual(["zone_pac", "zone_sedex"]);
  });
  it("aplica frete grátis acima do valor configurado", () => {
    expect(shippingOptionsForZip(zones, "01310100", 500_00)[0]).toMatchObject({ id: "zone_pac", provider: "TABLE", zoneId: "pac", priceCents: 0, isFree: true });
  });
  it("CEP inválido não retorna opções", () => {
    expect(shippingOptionsForZip(zones, "123", 100_00)).toEqual([]);
  });
});

describe("utilitários", () => {
  it("mergeCartLines soma variantes repetidas", () => {
    expect(mergeCartLines([{ variantId: "a", quantity: 1 }, { variantId: "a", quantity: 2 }, { variantId: "b", quantity: 1 }])).toEqual([
      { variantId: "a", quantity: 3 },
      { variantId: "b", quantity: 1 },
    ]);
  });
  it("installmentPreview respeita parcela mínima", () => {
    expect(installmentPreview(100_00, 12)).toEqual({ count: 2, valueCents: 50_00 });
    expect(installmentPreview(3000_00, 12).count).toBe(12);
  });
});
