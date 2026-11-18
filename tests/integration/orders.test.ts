import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { quoteCartLines } from "@/server/services/cart";
import { createOrder, expireOrder, MAX_PENDING_ORDERS_PER_USER } from "@/server/services/orders";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";

beforeEach(resetDb);

async function setup(stock = 10) {
  const [user, product, zone] = await Promise.all([createUser(), createProduct({ stock, priceCents: 1000_00, salePriceCents: 900_00 }), createShippingZone(25_00)]);
  return { user, variant: product.variants[0]!, zone };
}

const order = (userId: string, variantId: string, zoneId: string, quantity = 1, couponCode?: string) =>
  createOrder({ userId, items: [{ variantId, quantity }], address: validAddress, shippingOptionId: `zone_${zoneId}`, couponCode, customerDocument: VALID_CPF, customerPhone: "11999999999" });

describe("criação de pedido", () => {
  it("calcula valores no servidor (preço promocional + frete) e reserva estoque", async () => {
    const { user, variant, zone } = await setup(5);
    const created = await order(user.id, variant.id, zone.id, 2);
    const saved = await db.order.findUniqueOrThrow({ where: { id: created.id }, include: { items: true } });
    expect(saved).toMatchObject({ subtotalCents: 1800_00, shippingCents: 25_00, totalCents: 1825_00, status: "PENDING_PAYMENT" });
    expect(saved.items[0]).toMatchObject({ unitPriceCents: 900_00, quantity: 2, totalCents: 1800_00 });
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({ stock: 5, reserved: 2 });
    expect(saved.reservationExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("impede compra acima do estoque", async () => {
    const { user, variant, zone } = await setup(1);
    await expect(order(user.id, variant.id, zone.id, 2)).rejects.toMatchObject({ status: 409 });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).reserved).toBe(0);
  });

  it("CONCORRÊNCIA: 6 checkouts simultâneos com 3 unidades → exatamente 3 pedidos", async () => {
    const product = await createProduct({ stock: 3 });
    const zone = await createShippingZone();
    const users = await Promise.all(Array.from({ length: 6 }, () => createUser()));
    const results = await Promise.allSettled(users.map((u) => order(u.id, product.variants[0]!.id, zone.id, 1)));
    // Todas as falhas devem ser por falta de estoque (nenhum erro de concorrência).
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected.map((r) => r.reason?.code)).toEqual(["OUT_OF_STOCK", "OUT_OF_STOCK", "OUT_OF_STOCK"]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: product.variants[0]!.id } });
    expect(v).toMatchObject({ stock: 3, reserved: 3 });
  });

  it("produto em rascunho não pode ser comprado", async () => {
    const user = await createUser();
    const product = await createProduct({ status: "DRAFT" });
    const zone = await createShippingZone();
    await expect(order(user.id, product.variants[0]!.id, zone.id)).rejects.toMatchObject({ status: 409 });
  });

  it("aplica cupom e respeita limite total de usos", async () => {
    const { user, variant, zone } = await setup(10);
    await db.coupon.create({ data: { code: "DEZ", type: "PERCENT", value: 1000, maxRedemptions: 1, maxPerUser: null } });
    const first = await order(user.id, variant.id, zone.id, 1, "DEZ");
    expect((await db.order.findUniqueOrThrow({ where: { id: first.id } })).discountCents).toBe(90_00);
    const other = await createUser();
    await expect(order(other.id, variant.id, zone.id, 1, "DEZ")).rejects.toMatchObject({ status: 422 });
  });

  it("limita pedidos pendentes por cliente (anti-abuso de reserva)", async () => {
    const { user, variant, zone } = await setup(20);
    for (let i = 0; i < MAX_PENDING_ORDERS_PER_USER; i++) await order(user.id, variant.id, zone.id);
    await expect(order(user.id, variant.id, zone.id)).rejects.toMatchObject({ code: "TOO_MANY_PENDING_ORDERS" });
  });

  it("frete precisa atender o CEP", async () => {
    const { user, variant } = await setup();
    const zone = await db.shippingZone.create({ data: { name: "Sul", carrier: "X", serviceName: "Y", zipStart: 80000000, zipEnd: 99999999, priceCents: 10_00, minDays: 1, maxDays: 2 } });
    await expect(order(user.id, variant.id, zone.id)).rejects.toMatchObject({ status: 422 });
  });
});

describe("expiração", () => {
  it("libera reserva e uso do cupom ao expirar", async () => {
    const { user, variant, zone } = await setup(5);
    await db.coupon.create({ data: { code: "UMAVEZ", type: "FIXED", value: 10_00, maxRedemptions: 1 } });
    const created = await order(user.id, variant.id, zone.id, 2, "UMAVEZ");
    expect(await expireOrder(created.id)).toBe(false); // ainda no prazo

    await db.order.update({ where: { id: created.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    expect(await expireOrder(created.id)).toBe(true);
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({ stock: 5, reserved: 0 });
    expect(await db.couponRedemption.count()).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: created.id } })).status).toBe("EXPIRED");
    expect(await expireOrder(created.id)).toBe(false); // idempotente
  });
});

describe("cotação", () => {
  it("indica estoque insuficiente sem confiar no cliente", async () => {
    const { variant } = await setup(2);
    const [line] = await quoteCartLines([{ variantId: variant.id, quantity: 5 }]);
    expect(line).toMatchObject({ quantity: 2, issue: "INSUFFICIENT_STOCK", unitPriceCents: 900_00 });
  });
});
