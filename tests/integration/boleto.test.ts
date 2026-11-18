import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setPaymentGatewayForTests } from "@/server/payments/mercadopago";
import { BOLETO_COMPENSATION_DAYS, createBoletoPayment, createCardPayment, createPixPayment, syncProviderPayment } from "@/server/payments/service";
import { getDashboardMetrics } from "@/server/services/admin-metrics";
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

async function enableBoleto(days = 2) {
  await db.storeSettings.upsert({ where: { id: "default" }, create: { id: "default", boletoEnabled: true, boletoDueDays: days }, update: { boletoEnabled: true, boletoDueDays: days } });
}

async function pendingOrder(stock = 5) {
  const [user, product, zone] = await Promise.all([createUser(), createProduct({ stock, priceCents: 300_00 }), createShippingZone(10_00)]);
  const order = await createOrder({ userId: user.id, items: [{ variantId: product.variants[0]!.id, quantity: 1 }], address: validAddress, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" });
  return { user, variant: product.variants[0]!, order };
}

const sync = (id: string) => syncProviderPayment(id, { source: "webhook", eventKey: randomUUID(), signatureValid: true });

describe("boleto", () => {
  it("fica indisponível enquanto não for habilitado no painel", async () => {
    const { user, order } = await pendingOrder();
    await expect(createBoletoPayment(order.id, user.id)).rejects.toMatchObject({ code: "BOLETO_DISABLED" });
    expect(gw.payments.size).toBe(0);
  });

  it("gera boleto com endereço/CPF do pedido, estende a reserva e reaproveita o pendente", async () => {
    await enableBoleto(3);
    const { user, order } = await pendingOrder();
    const before = (await db.order.findUniqueOrThrow({ where: { id: order.id } })).reservationExpiresAt!;

    const b1 = await createBoletoPayment(order.id, user.id);
    expect(b1).toMatchObject({ method: "BOLETO", status: "PENDING", amountCents: 310_00 });
    expect(b1.ticketUrl).toMatch(/^https:\/\//);
    expect(b1.boletoLine).toBeTruthy();
    expect(gw.boletoInputs[0]!.payer).toMatchObject({ documentNumber: VALID_CPF, address: { zipCode: "01310100", state: "SP", number: "1000" } });

    const after = (await db.order.findUniqueOrThrow({ where: { id: order.id } })).reservationExpiresAt!;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
    expect(after.getTime()).toBe(b1.expiresAt!.getTime() + BOLETO_COMPENSATION_DAYS * 86_400_000);

    const b2 = await createBoletoPayment(order.id, user.id);
    expect(b2.id).toBe(b1.id);
    expect(gw.payments.size).toBe(1);
  });

  it("falha do provedor não estende a reserva", async () => {
    await enableBoleto();
    const { user, order } = await pendingOrder();
    const before = (await db.order.findUniqueOrThrow({ where: { id: order.id } })).reservationExpiresAt!;
    gw.createBoletoPayment = async () => {
      throw Object.assign(new Error("indisponível"), { status: 503 });
    };
    await expect(createBoletoPayment(order.id, user.id)).rejects.toBeTruthy();
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).reservationExpiresAt!.getTime()).toBe(before.getTime());
  });

  it("pedido com boleto pendente não expira antes do fim do prazo estendido", async () => {
    await enableBoleto();
    const { user, order } = await pendingOrder();
    await createBoletoPayment(order.id, user.id);
    expect(await expireOrder(order.id)).toBe(false);
  });

  it("boleto compensado confirma o pedido e baixa o estoque", async () => {
    await enableBoleto();
    const { user, variant, order } = await pendingOrder(5);
    const b = await createBoletoPayment(order.id, user.id);
    gw.setStatus(b.providerPaymentId!, "approved");
    await sync(b.providerPaymentId!);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    expect((await db.payment.findUniqueOrThrow({ where: { id: b.id } })).method).toBe("BOLETO");
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({ stock: 4, reserved: 0 });
  });
});

describe("proteção contra cobrança em duplicidade", () => {
  it("ao aprovar o PIX, o boleto pendente é cancelado no provedor", async () => {
    await enableBoleto();
    const { user, order } = await pendingOrder();
    const boleto = await createBoletoPayment(order.id, user.id);
    const pix = await createPixPayment(order.id, user.id);
    gw.setStatus(pix.providerPaymentId!, "approved");
    await sync(pix.providerPaymentId!);
    expect(gw.payments.get(boleto.providerPaymentId!)!.status).toBe("cancelled");
    expect(await db.payment.findUniqueOrThrow({ where: { id: boleto.id } })).toMatchObject({ status: "CANCELLED", statusDetail: "cancelled_other_payment_approved" });
  });

  it("se um segundo pagamento for aprovado mesmo assim, gera alerta de reembolso (sem baixar estoque de novo)", async () => {
    await enableBoleto();
    const { user, variant, order } = await pendingOrder(5);
    const boleto = await createBoletoPayment(order.id, user.id);
    // O cancelamento falha (ex.: o cliente já havia pago o boleto no banco).
    gw.cancelPayment = async () => {
      throw Object.assign(new Error("not cancellable"), { status: 400 });
    };
    await createCardPayment(order.id, user.id, { attemptId: randomUUID(), token: "approve", paymentMethodId: "visa", installments: 1, payerEmail: "a@b.com" });
    gw.setStatus(boleto.providerPaymentId!, "approved");
    await sync(boleto.providerPaymentId!);

    expect(await db.auditLog.count({ where: { action: "payment.duplicate_approved", entityId: boleto.id } })).toBe(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(4);
    const metrics = await getDashboardMetrics();
    expect(metrics.alerts).toEqual([expect.objectContaining({ id: boleto.id, reason: "DUPLICATE" })]);
  });

  it("pedido pago com um único pagamento NÃO gera alerta", async () => {
    const { user, order } = await pendingOrder();
    await createCardPayment(order.id, user.id, { attemptId: randomUUID(), token: "approve", paymentMethodId: "visa", installments: 1, payerEmail: "a@b.com" });
    expect((await getDashboardMetrics()).alerts).toEqual([]);
  });
});
