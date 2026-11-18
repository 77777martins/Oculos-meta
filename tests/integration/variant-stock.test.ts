import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setPaymentGatewayForTests } from "@/server/payments/mercadopago";
import { createPixPayment, syncProviderPayment } from "@/server/payments/service";
import { quoteCartLines } from "@/server/services/cart";
import { createOrder, expireOrder } from "@/server/services/orders";
import { FakeGateway } from "../helpers/fake-gateway";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";

let gw: FakeGateway;
beforeEach(async () => {
  await resetDb();
  gw = new FakeGateway();
  setPaymentGatewayForTests(gw);
});
afterAll(() => setPaymentGatewayForTests(undefined));

/** Produto com duas cores, cada uma com SKU, preço e estoque próprios (como no catálogo da loja). */
async function twoColors() {
  const product = await createProduct({ stock: 7, priceCents: 279_90 });
  const preto = product.variants[0]!;
  const tartaruga = await db.productVariant.create({ data: { productId: product.id, sku: `T-${randomUUID().slice(0, 8)}`.toUpperCase(), name: "Tartaruga", color: "Tartaruga", priceCents: 299_90, stock: 1 } });
  const [user, zone] = await Promise.all([createUser(), createShippingZone()]);
  const buy = (variantId: string, quantity = 1) =>
    createOrder({ userId: user.id, items: [{ variantId, quantity }], address: validAddress, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" });
  return { user, preto, tartaruga, buy };
}
const read = (id: string) => db.productVariant.findUniqueOrThrow({ where: { id }, select: { stock: true, reserved: true } });

describe("estoque individual por cor", () => {
  it("compra confirmada baixa só a cor comprada", async () => {
    const { user, preto, tartaruga, buy } = await twoColors();
    const order = await buy(preto.id, 2);
    expect(order.totalCents).toBe(2 * 279_90 + 20_00); // preço da cor + frete, calculado no servidor
    expect(await read(preto.id)).toEqual({ stock: 7, reserved: 2 }); // reservado enquanto aguarda pagamento

    const pix = await createPixPayment(order.id, user.id);
    gw.setStatus(pix.providerPaymentId!, "approved", { statusDetail: "accredited" });
    await syncProviderPayment(pix.providerPaymentId!, { source: "webhook", eventKey: randomUUID(), signatureValid: true });

    expect(await read(preto.id)).toEqual({ stock: 5, reserved: 0 }); // baixa definitiva
    expect(await read(tartaruga.id)).toEqual({ stock: 1, reserved: 0 }); // outra cor intacta
    expect(await db.inventoryMovement.count({ where: { variantId: preto.id, orderId: order.id } })).toBeGreaterThan(0); // histórico
  });

  it("cor esgotada não pode ser comprada e aparece como indisponível na cotação", async () => {
    const { tartaruga, buy } = await twoColors();
    await buy(tartaruga.id, 1); // reserva a última unidade
    await expect(buy(tartaruga.id, 1)).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    const [line] = await quoteCartLines([{ variantId: tartaruga.id, quantity: 1 }]);
    expect(line?.issue).toBeTruthy();
    expect(await read(tartaruga.id)).toEqual({ stock: 1, reserved: 1 }); // nunca negativo
  });

  it("o banco recusa estoque negativo mesmo fora do fluxo normal", async () => {
    const { preto } = await twoColors();
    await expect(db.productVariant.update({ where: { id: preto.id }, data: { stock: -1 } })).rejects.toThrow();
  });

  it("pedido não pago que expira devolve a unidade à mesma cor", async () => {
    const { tartaruga, buy } = await twoColors();
    const order = await buy(tartaruga.id, 1);
    await db.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    expect(await expireOrder(order.id)).toBe(true);
    expect(await read(tartaruga.id)).toEqual({ stock: 1, reserved: 0 });
    await expect(buy(tartaruga.id, 1)).resolves.toBeTruthy(); // volta a ser vendável
  });

  it("cor desativada não pode ser comprada", async () => {
    const { preto, buy } = await twoColors();
    await db.productVariant.update({ where: { id: preto.id }, data: { isActive: false } });
    await expect(buy(preto.id, 1)).rejects.toBeTruthy();
  });
});
