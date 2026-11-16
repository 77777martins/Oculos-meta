import "server-only";
import { db, type Tx } from "@/lib/db";
import { evaluateCoupon, type CouponEvaluation, type CouponRule } from "./pricing";

export interface CouponCheck {
  coupon: (CouponRule & { id: string }) | null;
  evaluation: CouponEvaluation;
}

/**
 * Valida um cupom para um subtotal. Com `lock`, trava a linha do cupom
 * (SELECT … FOR UPDATE) para que o limite de usos não seja ultrapassado por
 * checkouts simultâneos.
 */
export async function checkCoupon(
  code: string,
  ctx: { subtotalCents: number; userId: string | null; tx?: Tx; lock?: boolean },
): Promise<CouponCheck> {
  const client = ctx.tx ?? db;
  if (ctx.lock && ctx.tx) {
    await ctx.tx.$queryRaw`SELECT "id" FROM "Coupon" WHERE "code" = ${code} FOR UPDATE`;
  }
  const coupon = await client.coupon.findUnique({ where: { code } });
  if (!coupon) return { coupon: null, evaluation: { ok: false, reason: "Cupom inválido ou inativo." } };

  const [totalRedemptions, userRedemptions] = await Promise.all([
    client.couponRedemption.count({ where: { couponId: coupon.id } }),
    ctx.userId ? client.couponRedemption.count({ where: { couponId: coupon.id, userId: ctx.userId } }) : Promise.resolve(null),
  ]);

  return {
    coupon,
    evaluation: evaluateCoupon(coupon, { subtotalCents: ctx.subtotalCents, now: new Date(), totalRedemptions, userRedemptions }),
  };
}
