import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import type { bannerSchema, couponSchema, shippingZoneSchema } from "@/lib/validation/admin";
import type { categorySchema } from "@/lib/validation/catalog";

/** Regras de persistência das entidades simples do painel (usadas pela fábrica CRUD). */

export const categories = {
  create: (d: z.output<typeof categorySchema>) => db.category.create({ data: d, select: { id: true } }),
  update: (id: string, d: z.output<typeof categorySchema>) => db.category.update({ where: { id }, data: d, select: { id: true } }),
  async remove(id: string) {
    const used = await db.product.count({ where: { categoryId: id, deletedAt: null } });
    if (used > 0) throw new ConflictError("Esta categoria possui produtos. Mova-os ou desative a categoria.");
    await db.category.delete({ where: { id } });
  },
};

export const coupons = {
  create: (d: z.output<typeof couponSchema>) => db.coupon.create({ data: d, select: { id: true } }),
  update: (id: string, d: z.output<typeof couponSchema>) => db.coupon.update({ where: { id }, data: d, select: { id: true } }),
  /** Cupons já usados nunca são apagados (histórico financeiro) — apenas desativados. */
  async remove(id: string) {
    await db.coupon.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
  },
};

const zone = (d: z.output<typeof shippingZoneSchema>) => ({ ...d, zipStart: Number(d.zipStart), zipEnd: Number(d.zipEnd) });
export const shippingZones = {
  create: (d: z.output<typeof shippingZoneSchema>) => db.shippingZone.create({ data: zone(d), select: { id: true } }),
  update: (id: string, d: z.output<typeof shippingZoneSchema>) => db.shippingZone.update({ where: { id }, data: zone(d), select: { id: true } }),
  async remove(id: string) {
    const used = await db.order.count({ where: { shippingZoneId: id } });
    if (used > 0) await db.shippingZone.update({ where: { id }, data: { isActive: false } });
    else await db.shippingZone.delete({ where: { id } });
  },
};

export const banners = {
  create: (d: z.output<typeof bannerSchema>) => db.banner.create({ data: d, select: { id: true } }),
  update: (id: string, d: z.output<typeof bannerSchema>) => db.banner.update({ where: { id }, data: d, select: { id: true } }),
  async remove(id: string) {
    await db.banner.delete({ where: { id } });
  },
};
