import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { setPaymentGatewayForTests } from "@/server/payments/mercadopago";
import { createCardPayment, createPixPayment, refundPayment, syncProviderPayment } from "@/server/payments/service";
import { adminUpdateOrderStatus, createOrder, expireOrder } from "@/server/services/orders";
import { orderCreatedEmail, orderShippedEmail } from "@/server/services/mail";
import { FakeGateway } from "../helpers/fake-gateway";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";

/** Em testes não há RESEND_API_KEY: o e-mail é registrado no console (modo DEV). */
const sent = () => vi.mocked(console.info).mock.calls.map((c) => String(c[0]));
const subjects = () => sent().map((s) => s.match(/Assunto: (.*)/)?.[1]).filter(Boolean);

let gw: FakeGateway;
beforeEach(async () => {
  await resetDb();
  gw = new FakeGateway();
  setPaymentGatewayForTests(gw);
  vi.mocked(console.info).mockClear();
});
afterAll(() => setPaymentGatewayForTests(undefined));

async function newOrder(email?: string) {
  const [user, product, zone] = await Promise.all([createUser({ email }), createProduct({ stock: 5, priceCents: 300_00 }), createShippingZone(10_00)]);
  const order = await createOrder({ userId: user.id, items: [{ variantId: product.variants[0]!.id, quantity: 1 }], address: validAddress, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" });
  return { user, order };
}

describe("e-mails do ciclo do pedido", () => {
  it("pedido criado → e-mail com link de pagamento", async () => {
    const { order } = await newOrder("cliente@ex.com");
    expect(subjects()).toEqual([`Recebemos seu pedido #${order.number}`]);
    expect(sent()[0]).toContain("Para: cliente@ex.com");
    expect(sent()[0]).toContain(`/checkout/pagamento/${order.id}`);
  });

  it("pagamento aprovado (via provedor) → e-mail de confirmação, uma única vez", async () => {
    const { user, order } = await newOrder();
    const pix = await createPixPayment(order.id, user.id);
    gw.setStatus(pix.providerPaymentId!, "approved");
    vi.mocked(console.info).mockClear();
    await syncProviderPayment(pix.providerPaymentId!, { source: "webhook", eventKey: randomUUID(), signatureValid: true });
    await syncProviderPayment(pix.providerPaymentId!, { source: "webhook", eventKey: randomUUID(), signatureValid: true });
    expect(subjects()).toEqual([`Pagamento aprovado — pedido #${order.number}`]);
  });

  it("enviado → e-mail com código e link oficial dos Correios; entregue → e-mail", async () => {
    const { user, order } = await newOrder();
    await createCardPayment(order.id, user.id, { attemptId: randomUUID(), token: "approve", paymentMethodId: "visa", installments: 1, payerEmail: "a@b.com" });
    await db.shipment.create({ data: { orderId: order.id, carrier: "Correios", trackingCode: "AA123456789BR" } });
    vi.mocked(console.info).mockClear();
    await adminUpdateOrderStatus({ orderId: order.id, to: "SHIPPED", note: null, actorId: null, ip: null });
    await adminUpdateOrderStatus({ orderId: order.id, to: "DELIVERED", note: null, actorId: null, ip: null });
    expect(subjects()).toEqual([`Seu pedido #${order.number} foi enviado`, `Pedido #${order.number} entregue`]);
    expect(sent()[0]).toContain("AA123456789BR");
    expect(sent()[0]).toContain("https://rastreamento.correios.com.br/app/index.php?objeto=AA123456789BR");
  });

  it("expirado → e-mail uma única vez", async () => {
    const { order } = await newOrder();
    await db.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    vi.mocked(console.info).mockClear();
    await expireOrder(order.id);
    await expireOrder(order.id);
    expect(subjects()).toEqual([`Pedido #${order.number} expirado`]);
  });

  it("reembolso → e-mail com o valor reembolsado", async () => {
    const { user, order } = await newOrder();
    const p = await createCardPayment(order.id, user.id, { attemptId: randomUUID(), token: "approve", paymentMethodId: "visa", installments: 1, payerEmail: "a@b.com" });
    const admin = await createUser({ role: "ADMIN" });
    vi.mocked(console.info).mockClear();
    await refundPayment({ paymentId: p.id, amountCents: 50_00, reason: "Ajuste", actorId: admin.id, ip: "1.1.1.1" });
    expect(subjects()).toEqual([`Reembolso do pedido #${order.number}`]);
    expect(sent()[0]).toMatch(/R\$\s50,00/);
  });

  it("conta anonimizada (LGPD) não recebe e-mails", async () => {
    const { user, order } = await newOrder();
    await db.user.update({ where: { id: user.id }, data: { anonymizedAt: new Date() } });
    vi.mocked(console.info).mockClear();
    await adminUpdateOrderStatus({ orderId: order.id, to: "CANCELLED", note: null, actorId: null, ip: null });
    expect(subjects()).toEqual([]);
  });
});

describe("modelos de e-mail", () => {
  it("escapam dados digitados pelo cliente (anti-injeção de HTML)", () => {
    const m = orderCreatedEmail('<img src=x onerror="alert(1)">', 1001, "R$ 10,00", "https://loja.com/pagar", null);
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("&lt;img");
    const s = orderShippedEmail("Ana", 1, "https://loja.com", { code: "<b>X</b>", url: null, carrier: null });
    expect(s.html).not.toContain("<b>X</b>");
  });
});
