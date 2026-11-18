import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getRequestContext } from "@/lib/security/request";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { cartQuoteSchema } from "@/lib/validation/checkout";
import { quoteCartLines } from "@/server/services/cart";
import { checkCoupon } from "@/server/services/coupons";
import { computeTotals } from "@/server/services/pricing";
import { getShippingOptions } from "@/server/services/shipping";

/**
 * Cotação do carrinho. TODOS os valores são calculados aqui, a partir do banco.
 * O frete retornado é o mais barato disponível; a escolha final ocorre no checkout.
 */
export const POST = apiHandler(async (req) => {
  const { ip } = await getRequestContext();
  await enforceRateLimit(RATE_LIMITS.quote, ip);
  const input = await parseJson(req, cartQuoteSchema);
  const user = await getCurrentUser();

  const lines = await quoteCartLines(input.items);
  const subtotalCents = lines.reduce((a, l) => a + l.lineTotalCents, 0);

  let coupon = null;
  let couponMessage: string | null = null;
  if (input.couponCode) {
    await enforceRateLimit(RATE_LIMITS.coupon, ip);
    const check = await checkCoupon(input.couponCode, { subtotalCents, userId: user?.id ?? null });
    if (check.evaluation.ok) coupon = check.coupon;
    else couponMessage = check.evaluation.reason;
  }

  const shippingOptions = input.zipCode
    ? await getShippingOptions({
        zipCode: input.zipCode,
        subtotalCents,
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPriceCents: l.unitPriceCents, weightGrams: l.weightGrams })),
      })
    : [];
  const cheapest = shippingOptions[0];
  const totals = computeTotals({
    lines: lines.filter((l) => l.quantity > 0).map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
    coupon,
    shippingCents: cheapest?.priceCents ?? 0,
  });

  return ok({
    lines,
    shippingOptions,
    coupon: coupon ? { code: coupon.code, type: coupon.type } : null,
    couponMessage,
    totals: { ...totals, shippingCalculated: Boolean(cheapest) },
  });
});
