import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setPaymentGatewayForTests } from "@/server/payments/mercadopago";
import { createCardPayment, createPixPayment, refreshOrderPaymentStatus, refundPayment, syncProviderPayment } from "@/server/payments/service";
import { createOrder } from "@/server/services/orders";
import { FakeGateway } from "../helpers/fake-gateway";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";

let gw: FakeGateway;
beforeEach(async () => {
  await resetDb();
  gw = new FakeGateway();
  setPaymentGatewayForTests(gw);
});
afterAll(() => setPaymentGatewayForTests(undefined));

async function pendingOrder(stock = 5, quantity = 1) {
  const [user, product, zone] = await Promise.all([createUser(), createProduct({ stock, priceCents: 500_00 }), createShippingZone(20_00)]);
  const variant = product.variants[0]!;
  const order = await createOrder({ userId: user.id, items: [{ variantId: variant.id, quantity }], address: validAddress, shippingZoneId: zone.id, customerDocument: VALID_CPF, customerPhone: "11999999999" });
  return { user, variant, order };
}

const sync = (id: string, key = randomUUID()) => syncProviderPayment(id, { source: "webhook", eventKey: key, signatureValid: true });

describe("PIX", () => {
  it("gera QR Code com o valor do pedido (do banco) e reaproveita PIX pendente", async () => {
    const { user, order } = await pendingOrder();
    const p1 = await createPixPayment(order.id, user.id);
    expect(p1).toMatchObject({ method: "PIX", status: "PENDING", amountCents: 520_00 });
    expect(p1.pixQrCode).toBeTruthy();
    const p2 = await createPixPayment(order.id, user.id);
    expect(p2.id).toBe(p1.id);
    expect(gw.payments.size).toBe(1);
  });

  it("IDOR: outro cliente não consegue pagar/consultar o pedido", async () => {
    const { order } = await pendingOrder();
    const intruder = await createUser();
    await expect(createPixPayment(order.id, intruder.id)).rejects.toMatchObject({ status: 404 });
    await expect(refreshOrderPaymentStatus(order.id, intruder.id)).rejects.toMatchObject({ status: 404 });
  });

  it("aprovação confirmada pelo provedor → pedido PAGO e estoque baixado definitivamente", async () => {
    const { user, variant, order } = await pendingOrder(5, 2);
    const pix = await createPixPayment(order.id, user.id);
    // Antes de pagar no provedor, nada muda.
    await sync(pix.providerPaymentId!);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");

    gw.setStatus(pix.providerPaymentId!, "approved", { statusDetail: "accredited" });
    await sync(pix.providerPaymentId!);
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe("PAID");
    expect(saved.paidAt).not.toBeNull();
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({ stock: 3, reserved: 0 });
    expect(await db.inventoryMovement.count({ where: { orderId: order.id, type: "SALE" } })).toBe(1);
  });

  it("IDEMPOTÊNCIA: notificações repetidas/concorrentes não baixam o estoque duas vezes", async () => {
    const { user, variant, order } = await pendingOrder(5, 1);
    const pix = await createPixPayment(order.id, user.id);
    gw.setStatus(pix.providerPaymentId!, "approved");
    await Promise.all([sync(pix.providerPaymentId!), sync(pix.providerPaymentId!), sync(pix.providerPaymentId!)]);
    await sync(pix.providerPaymentId!);
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({ stock: 4, reserved: 0 });
    expect(await db.inventoryMovement.count({ where: { orderId: order.id, type: "SALE" } })).toBe(1);
    expect(await db.orderStatusHistory.count({ where: { orderId: order.id, toStatus: "PAID" } })).toBe(1);
  });

  it("status antigo (pending) chegando depois de approved não regride o pagamento", async () => {
    const { user, order } = await pendingOrder();
    const pix = await createPixPayment(order.id, user.id);
    gw.setStatus(pix.providerPaymentId!, "approved");
    await sync(pix.providerPaymentId!);
    gw.setStatus(pix.providerPaymentId!, "pending");
    await sync(pix.providerPaymentId!);
    expect((await db.payment.findUniqueOrThrow({ where: { id: pix.id } })).status).toBe("APPROVED");
  });

  it("valor divergente do pedido NÃO confirma o pagamento", async () => {
    const { user, order } = await pendingOrder();
    const pix = await createPixPayment(order.id, user.id);
    gw.setStatus(pix.providerPaymentId!, "approved", { amountCents: 1 });
    await sync(pix.providerPaymentId!);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
    expect((await db.payment.findUniqueOrThrow({ where: { id: pix.id } })).statusDetail).toBe("amount_mismatch");
  });

  it("pagamento aprovado após expiração: confirma se houver estoque", async () => {
    const { user, variant, order } = await pendingOrder(5, 1);
    const pix = await createPixPayment(order.id, user.id);
    await db.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    const { expireOrder } = await import("@/server/services/orders");
    await expireOrder(order.id);
    gw.setStatus(pix.providerPaymentId!, "approved");
    await sync(pix.providerPaymentId!);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({ stock: 4, reserved: 0 });
  });

  it("pagamento aprovado após expiração SEM estoque: não vende, registra alerta e não altera estoque", async () => {
    const { user, variant, order } = await pendingOrder(1, 1);
    const pix = await createPixPayment(order.id, user.id);
    await db.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    const { expireOrder } = await import("@/server/services/orders");
    await expireOrder(order.id);
    await db.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } }); // vendido em outro canal

    gw.setStatus(pix.providerPaymentId!, "approved");
    await sync(pix.providerPaymentId!);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
    expect((await db.payment.findUniqueOrThrow({ where: { id: pix.id } })).status).toBe("APPROVED");
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({ stock: 0, reserved: 0 });
    expect(await db.auditLog.count({ where: { action: "payment.approved_without_stock" } })).toBe(1);
  });

  it("ID de pagamento desconhecido é recusado", async () => {
    gw.payments.set("777", { ...(await gw.createPixPayment({ idempotencyKey: "x", externalReference: "inexistente", amountCents: 100, description: "", expiresAt: new Date(), payer: { email: "a@b.com", firstName: "a", lastName: "b", documentType: "CPF", documentNumber: VALID_CPF }, notificationUrl: null })), id: "777" });
    await expect(sync("777")).rejects.toMatchObject({ status: 404 });
  });
});

describe("cartão", () => {
  const card = (token: string, attemptId = randomUUID()) => ({ attemptId, token, paymentMethodId: "visa", installments: 3, payerEmail: "a@b.com" });

  it("aprovado → pedido pago imediatamente", async () => {
    const { user, order } = await pendingOrder();
    const p = await createCardPayment(order.id, user.id, card("approve-token"));
    expect(p.status).toBe("APPROVED");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });

  it("mesma tentativa reenviada (duplo clique) não gera segunda cobrança", async () => {
    const { user, order } = await pendingOrder();
    const attempt = randomUUID();
    const a = await createCardPayment(order.id, user.id, card("pending-token", attempt));
    const b = await createCardPayment(order.id, user.id, card("pending-token", attempt));
    expect(a.id).toBe(b.id);
    expect(gw.payments.size).toBe(1);
  });

  it("recusado mantém o pedido aguardando e permite nova tentativa", async () => {
    const { user, order } = await pendingOrder();
    const p = await createCardPayment(order.id, user.id, card("reject-token"));
    expect(p.status).toBe("REJECTED");
    const retry = await createCardPayment(order.id, user.id, card("approve-token"));
    expect(retry.status).toBe("APPROVED");
  });

  it("pedido já pago não aceita novo pagamento", async () => {
    const { user, order } = await pendingOrder();
    await createCardPayment(order.id, user.id, card("approve-token"));
    await expect(createCardPayment(order.id, user.id, card("approve-token"))).rejects.toMatchObject({ status: 409 });
  });

  it("parcelamento acima do configurado é recusado", async () => {
    const { user, order } = await pendingOrder();
    await expect(createCardPayment(order.id, user.id, { ...card("approve-token"), installments: 24 })).rejects.toMatchObject({ status: 422 });
  });
});

describe("reembolso", () => {
  it("reembolso total → pedido REEMBOLSADO e estoque devolvido (antes do envio)", async () => {
    const { user, variant, order } = await pendingOrder(5, 1);
    const p = await createCardPayment(order.id, user.id, { attemptId: randomUUID(), token: "approve", paymentMethodId: "visa", installments: 1, payerEmail: "a@b.com" });
    const admin = await createUser({ role: "ADMIN" });
    await refundPayment({ paymentId: p.id, reason: "Desistência", actorId: admin.id, ip: "1.1.1.1" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    expect(await db.payment.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ status: "REFUNDED", refundedCents: 520_00 });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(5);
  });

  it("reembolso parcial mantém o pedido e não permite exceder o valor", async () => {
    const { user, order } = await pendingOrder();
    const p = await createCardPayment(order.id, user.id, { attemptId: randomUUID(), token: "approve", paymentMethodId: "visa", installments: 1, payerEmail: "a@b.com" });
    const admin = await createUser({ role: "ADMIN" });
    await refundPayment({ paymentId: p.id, amountCents: 100_00, reason: "Ajuste", actorId: admin.id, ip: "1.1.1.1" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    await expect(refundPayment({ paymentId: p.id, amountCents: 1000_00, reason: "Excesso", actorId: admin.id, ip: "1.1.1.1" })).rejects.toMatchObject({ status: 422 });
  });
});
