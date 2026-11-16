import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { loginUser } from "@/server/services/auth";
import { createOrder } from "@/server/services/orders";
import { createPixPayment } from "@/server/payments/service";
import { setPaymentGatewayForTests } from "@/server/payments/mercadopago";
import { POST as checkoutPOST } from "@/app/api/checkout/route";
import { POST as couponPOST } from "@/app/api/admin/coupons/route";
import { PATCH as staffPATCH } from "@/app/api/admin/staff/[id]/route";
import { PUT as addressPUT } from "@/app/api/account/addresses/[id]/route";
import { POST as webhookPOST } from "@/app/api/webhooks/mercadopago/route";
import { GET as cronGET } from "@/app/api/cron/expire-orders/route";
import { requestState } from "../helpers/integration-setup";
import { FakeGateway } from "../helpers/fake-gateway";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";

const ORIGIN = "http://localhost:3000";
const ctx = { ip: "203.0.113.10", userAgent: "vitest" };
const json = (url: string, body: unknown, method = "POST", origin: string | null = ORIGIN) =>
  new Request(`${ORIGIN}${url}`, { method, headers: { "content-type": "application/json", host: "localhost:3000", ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
const params = <T>(p: T) => ({ params: Promise.resolve(p) });

async function loginAs(role: "CUSTOMER" | "SUPPORT" | "MANAGER" | "ADMIN") {
  requestState.cookies.clear();
  const user = await createUser({ role });
  await loginUser({ email: user.email, password: "SenhaForte123" }, ctx);
  return user;
}

let gw: FakeGateway;
beforeEach(async () => {
  await resetDb();
  requestState.cookies.clear();
  gw = new FakeGateway();
  setPaymentGatewayForTests(gw);
});
afterAll(() => setPaymentGatewayForTests(undefined));

describe("autenticação e CSRF nas rotas", () => {
  it("checkout sem sessão → 401", async () => {
    const res = await checkoutPOST(json("/api/checkout", {}), params({}));
    expect(res.status).toBe(401);
  });

  it("requisição sem Origin/Referer → 403 (CSRF)", async () => {
    await loginAs("CUSTOMER");
    const res = await checkoutPOST(json("/api/checkout", {}, "POST", null), params({}));
    expect(res.status).toBe(403);
  });

  it("origem de outro site → 403", async () => {
    await loginAs("CUSTOMER");
    const res = await checkoutPOST(json("/api/checkout", {}, "POST", "https://evil.example"), params({}));
    expect(res.status).toBe(403);
  });
});

describe("autorização (RBAC) no painel", () => {
  const coupon = { code: "NOVO10", type: "PERCENT", value: 1000, minSubtotalCents: 0, isActive: true };

  it("cliente não cria cupom → 403", async () => {
    await loginAs("CUSTOMER");
    expect((await couponPOST(json("/api/admin/coupons", coupon), params({}))).status).toBe(403);
  });

  it("atendimento não cria cupom → 403; gerente cria → 201 com auditoria", async () => {
    await loginAs("SUPPORT");
    expect((await couponPOST(json("/api/admin/coupons", coupon), params({}))).status).toBe(403);
    const manager = await loginAs("MANAGER");
    expect((await couponPOST(json("/api/admin/coupons", coupon), params({}))).status).toBe(201);
    expect(await db.auditLog.count({ where: { actorId: manager.id, action: "Coupon.create" } })).toBe(1);
  });

  it("admin não altera o próprio papel; último admin não é rebaixado", async () => {
    const admin = await loginAs("ADMIN");
    const res = await staffPATCH(json(`/api/admin/staff/${admin.id}`, { role: "CUSTOMER" }, "PATCH"), params({ id: admin.id }));
    expect(res.status).toBe(422);
  });
});

describe("IDOR", () => {
  it("cliente não edita endereço de outro cliente → 404", async () => {
    const victim = await createUser();
    const address = await db.address.create({ data: { ...validAddress, userId: victim.id } });
    await loginAs("CUSTOMER");
    const res = await addressPUT(json(`/api/account/addresses/${address.id}`, validAddress, "PUT"), params({ id: address.id }));
    expect(res.status).toBe(404);
  });

  it("checkout com endereço salvo de outro cliente → 404", async () => {
    const victim = await createUser();
    const address = await db.address.create({ data: { ...validAddress, userId: victim.id } });
    const product = await createProduct();
    const zone = await createShippingZone();
    await loginAs("CUSTOMER");
    const res = await checkoutPOST(
      json("/api/checkout", { items: [{ variantId: product.variants[0]!.id, quantity: 1 }], addressId: address.id, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" }),
      params({}),
    );
    expect(res.status).toBe(404);
  });
});

describe("webhook do Mercado Pago", () => {
  const secret = "test-webhook-secret";
  function signed(dataId: string, body: object, opts: { badSecret?: boolean; requestId?: string } = {}) {
    const ts = String(Math.floor(Date.now() / 1000));
    const requestId = opts.requestId ?? randomUUID();
    const v1 = createHmac("sha256", opts.badSecret ? "errado" : secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
    return new Request(`${ORIGIN}/api/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
      body: JSON.stringify(body),
    });
  }

  async function pixScenario() {
    const user = await createUser();
    const product = await createProduct({ stock: 3 });
    const zone = await createShippingZone();
    const order = await createOrder({ userId: user.id, items: [{ variantId: product.variants[0]!.id, quantity: 1 }], address: validAddress, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" });
    const pix = await createPixPayment(order.id, user.id);
    return { order, pix };
  }

  it("assinatura inválida → 401 e nada muda", async () => {
    const { order, pix } = await pixScenario();
    gw.setStatus(pix.providerPaymentId!, "approved");
    const res = await webhookPOST(signed(pix.providerPaymentId!, { type: "payment", action: "payment.updated", id: 1, data: { id: pix.providerPaymentId } }, { badSecret: true }));
    expect(res.status).toBe(401);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
  });

  it("corpo forjado dizendo 'approved' não aprova: o status vem da API do provedor", async () => {
    const { order, pix } = await pixScenario();
    const res = await webhookPOST(signed(pix.providerPaymentId!, { type: "payment", action: "payment.updated", id: 2, data: { id: pix.providerPaymentId, status: "approved" } }));
    expect(res.status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
  });

  it("notificação válida aprova; reenvio da mesma notificação é deduplicado", async () => {
    const { order, pix } = await pixScenario();
    gw.setStatus(pix.providerPaymentId!, "approved");
    const body = { type: "payment", action: "payment.updated", id: 3, data: { id: pix.providerPaymentId } };
    expect((await webhookPOST(signed(pix.providerPaymentId!, body))).status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    const again = await webhookPOST(signed(pix.providerPaymentId!, body));
    expect(await again.json()).toMatchObject({ duplicate: true });
    expect(await db.paymentEvent.count({ where: { source: "webhook" } })).toBe(1);
  });
});

describe("cron", () => {
  it("exige o segredo e expira pedidos vencidos", async () => {
    expect((await cronGET(new Request(`${ORIGIN}/api/cron/expire-orders`))).status).toBe(401);
    const user = await createUser();
    const product = await createProduct({ stock: 2 });
    const zone = await createShippingZone();
    const order = await createOrder({ userId: user.id, items: [{ variantId: product.variants[0]!.id, quantity: 2 }], address: validAddress, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" });
    await db.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    const res = await cronGET(new Request(`${ORIGIN}/api/cron/expire-orders`, { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(await res.json()).toMatchObject({ expired: 1 });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: product.variants[0]!.id } })).reserved).toBe(0);
  });
});
