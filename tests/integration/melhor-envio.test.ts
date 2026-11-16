import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { loginUser } from "@/server/services/auth";
import { createOrder } from "@/server/services/orders";
import { getShippingOptions } from "@/server/services/shipping";
import { exchangeAuthorizationCode, OAUTH_STATE_COOKIE, PROVIDER } from "@/server/shipping/melhor-envio";
import { linkAndSyncShipment, mapMelhorEnvioStatus, parseProviderDate, syncOpenShipments } from "@/server/shipping/tracking-sync";
import { GET as callbackGET } from "@/app/api/integrations/melhor-envio/callback/route";
import { requestState } from "../helpers/integration-setup";
import { FakeMelhorEnvio } from "../helpers/fake-melhor-envio";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";

let me: FakeMelhorEnvio;

async function connect(opts: { expiresInMs?: number } = {}) {
  await db.integrationCredential.create({
    data: {
      provider: PROVIDER,
      environment: "sandbox",
      accessTokenEnc: encryptSecret("access-token-1"),
      refreshTokenEnc: encryptSecret("refresh-token-1"),
      expiresAt: new Date(Date.now() + (opts.expiresInMs ?? 20 * 86_400_000)),
    },
  });
}

async function enable() {
  await db.storeSettings.upsert({
    where: { id: "default" },
    create: { id: "default", melhorEnvioEnabled: true, shippingOriginZip: "01310100" },
    update: { melhorEnvioEnabled: true, shippingOriginZip: "01310100" },
  });
}

const ctx = (variantId: string) => ({ zipCode: "20040020", subtotalCents: 1000_00, lines: [{ variantId, quantity: 2, unitPriceCents: 500_00, weightGrams: 250 }] });

beforeEach(async () => {
  await resetDb();
  requestState.cookies.clear();
  me = new FakeMelhorEnvio().install();
});
afterEach(() => vi.unstubAllGlobals());

describe("criptografia dos tokens", () => {
  it("cifra com AES-GCM e detecta adulteração", () => {
    const enc = encryptSecret("segredo-123");
    expect(enc).not.toContain("segredo-123");
    expect(decryptSecret(enc)).toBe("segredo-123");
    const parts = enc.split(".");
    parts[3] = Buffer.from("x" + Buffer.from(parts[3]!, "base64url").toString("latin1"), "latin1").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
    expect(() => decryptSecret(enc, "outro-contexto")).toThrow();
  });
});

describe("cotação", () => {
  it("usa custom_price/custom_delivery_range, ignora serviços com erro e envia o formato documentado", async () => {
    await connect();
    await enable();
    const product = await createProduct();
    const options = await getShippingOptions(ctx(product.variants[0]!.id));
    expect(options.map((o) => [o.id, o.priceCents, o.minDays, o.maxDays, o.carrier])).toEqual([
      ["me_1", 3550, 7, 8, "Correios"],
      ["me_2", 6120, 2, 3, "Correios"],
    ]);
    const req = me.requests.find((r) => r.path === "/api/v2/me/shipment/calculate")!;
    expect(req.headers["user-agent"]).toBe("Oculos Meta Store Testes (dev@example.com)");
    expect(req.body).toMatchObject({ from: { postal_code: "01310100" }, to: { postal_code: "20040020" } });
    // Unidades da documentação: cm, kg, reais.
    expect((req.body as { products: unknown[] }).products[0]).toMatchObject({ width: 16, height: 8, length: 20, weight: 0.25, insurance_value: 500, quantity: 2 });
  });

  it("usa a tabela por CEP como reserva quando o Melhor Envio falha", async () => {
    await connect();
    await enable();
    const zone = await createShippingZone(19_90);
    me.failCalculate = true;
    const product = await createProduct();
    const options = await getShippingOptions(ctx(product.variants[0]!.id));
    expect(options.map((o) => o.id)).toEqual([`zone_${zone.id}`]);
  });

  it("desabilitado ou desconectado → somente tabela, sem chamar a API", async () => {
    const zone = await createShippingZone();
    const product = await createProduct();
    expect((await getShippingOptions(ctx(product.variants[0]!.id))).map((o) => o.id)).toEqual([`zone_${zone.id}`]);
    expect(me.requests).toHaveLength(0);
  });

  it("renova o token após 401 e repete a requisição", async () => {
    await connect();
    await enable();
    me.validTokens.delete("access-token-1"); // token revogado/expirado no provedor
    const product = await createProduct();
    const options = await getShippingOptions(ctx(product.variants[0]!.id));
    expect(options[0]!.id).toBe("me_1");
    expect(me.requests.map((r) => r.path)).toEqual(["/api/v2/me/shipment/calculate", "/oauth/token", "/api/v2/me/shipment/calculate"]);
    const cred = await db.integrationCredential.findUniqueOrThrow({ where: { provider: PROVIDER } });
    expect(decryptSecret(cred.accessTokenEnc)).toBe("access-token-2");
  });

  it("renova preventivamente quando falta menos de 1 dia para expirar", async () => {
    await connect({ expiresInMs: 3_600_000 });
    await enable();
    const product = await createProduct();
    await getShippingOptions(ctx(product.variants[0]!.id));
    expect(me.requests[0]!.path).toBe("/oauth/token");
    expect(me.requests[0]!.body).toMatchObject({ grant_type: "refresh_token", refresh_token: "refresh-token-1", client_id: 4242 });
  });
});

describe("checkout com Melhor Envio", () => {
  async function order(optionId: string) {
    const user = await createUser();
    const product = await createProduct({ priceCents: 500_00 });
    return createOrder({
      userId: user.id,
      items: [{ variantId: product.variants[0]!.id, quantity: 1 }],
      address: { ...validAddress, zipCode: "20040020" },
      shippingOptionId: optionId,
      customerDocument: VALID_CPF,
      customerPhone: "11999999999",
    });
  }

  it("recalcula o frete no servidor e salva a cotação no pedido", async () => {
    await connect();
    await enable();
    const created = await order("me_2");
    const saved = await db.order.findUniqueOrThrow({ where: { id: created.id } });
    expect(saved).toMatchObject({ shippingCents: 61_20, totalCents: 561_20, shippingProvider: "MELHOR_ENVIO", shippingServiceId: 2, shippingCarrier: "Correios", shippingService: "SEDEX" });
    expect(saved.shippingQuote).toMatchObject({ id: "me_2", priceCents: 6120 });
  });

  it("recusa serviço que não está na cotação do servidor", async () => {
    await connect();
    await enable();
    await expect(order("me_3")).rejects.toMatchObject({ status: 422 }); // .Package veio com erro
    await expect(order("me_999")).rejects.toMatchObject({ status: 422 });
  });
});

describe("OAuth", () => {
  it("troca o código e guarda os tokens CRIPTOGRAFADOS", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await exchangeAuthorizationCode("good-code", admin.id);
    const cred = await db.integrationCredential.findUniqueOrThrow({ where: { provider: PROVIDER } });
    expect(cred.accessTokenEnc).not.toContain("access-token");
    expect(decryptSecret(cred.refreshTokenEnc)).toMatch(/^refresh-token-/);
    expect(me.requests[0]!.body).toMatchObject({ grant_type: "authorization_code", redirect_uri: "http://localhost:3000/api/integrations/melhor-envio/callback" });
  });

  async function adminSession() {
    const admin = await createUser({ role: "ADMIN" });
    await loginUser({ email: admin.email, password: "SenhaForte123" }, { ip: "1.1.1.1", userAgent: "t" });
    return admin;
  }

  it("callback com state inválido é recusado e nada é salvo", async () => {
    const admin = await adminSession();
    requestState.cookies.set(OAUTH_STATE_COOKIE, `estado-certo.${admin.id}`);
    const res = await callbackGET(new Request("http://localhost:3000/api/integrations/melhor-envio/callback?code=good-code&state=estado-forjado"));
    expect(res.headers.get("location")).toContain("me=estado-invalido");
    expect(await db.integrationCredential.count()).toBe(0);
  });

  it("callback com state emitido para OUTRO usuário é recusado", async () => {
    await adminSession();
    requestState.cookies.set(OAUTH_STATE_COOKIE, "estado-certo.outro-usuario");
    const res = await callbackGET(new Request("http://localhost:3000/api/integrations/melhor-envio/callback?code=good-code&state=estado-certo"));
    expect(res.headers.get("location")).toContain("me=estado-invalido");
  });

  it("callback válido conecta e consome o state", async () => {
    const admin = await adminSession();
    requestState.cookies.set(OAUTH_STATE_COOKIE, `estado-certo.${admin.id}`);
    const res = await callbackGET(new Request("http://localhost:3000/api/integrations/melhor-envio/callback?code=good-code&state=estado-certo"));
    expect(res.headers.get("location")).toContain("me=conectado");
    expect(await db.integrationCredential.count()).toBe(1);
    expect(requestState.cookies.has(OAUTH_STATE_COOKIE)).toBe(false);
    expect(requestState.cookies.has(SESSION_COOKIE)).toBe(true);
  });

  it("cliente comum não conclui a conexão", async () => {
    const user = await createUser();
    await loginUser({ email: user.email, password: "SenhaForte123" }, { ip: "1.1.1.1", userAgent: "t" });
    requestState.cookies.set(OAUTH_STATE_COOKIE, `estado-certo.${user.id}`);
    const res = await callbackGET(new Request("http://localhost:3000/api/integrations/melhor-envio/callback?code=good-code&state=estado-certo"));
    expect(res.headers.get("location")).toContain("/entrar");
    expect(await db.integrationCredential.count()).toBe(0);
  });
});

describe("rastreio automático", () => {
  async function paidOrderWithTracking(code: string) {
    const user = await createUser();
    const product = await createProduct();
    // Com o Melhor Envio ativo, só as opções cotadas por ele são oferecidas.
    const o = await createOrder({ userId: user.id, items: [{ variantId: product.variants[0]!.id, quantity: 1 }], address: validAddress, shippingOptionId: "me_1", customerDocument: VALID_CPF, customerPhone: "11999999999" });
    await db.order.update({ where: { id: o.id }, data: { status: "PAID", paidAt: new Date() } });
    await db.shipment.create({ data: { orderId: o.id, carrier: "Correios", trackingCode: code } });
    return o;
  }

  it("localiza a etiqueta pelo código, registra postagem e entrega, sem duplicar eventos", async () => {
    await connect();
    await enable();
    const o = await paidOrderWithTracking("ME220021P41BR");
    me.labels.set("lbl-1", { id: "lbl-1", protocol: "ORD-1", status: "posted", tracking: "ME220021P41BR", posted_at: "2026-11-10 13:55:05", delivered_at: null });

    expect(await linkAndSyncShipment(o.id)).toEqual({ linked: true, status: "posted" });
    let order = await db.order.findUniqueOrThrow({ where: { id: o.id }, include: { shipment: { include: { events: true } } } });
    expect(order.status).toBe("SHIPPED");
    expect(order.shipment).toMatchObject({ providerOrderId: "lbl-1", providerStatus: "posted", status: "POSTED" });
    expect(order.shipment!.events[0]!.occurredAt.toISOString()).toBe("2026-11-10T16:55:05.000Z"); // horário de Brasília → UTC

    // Entregue: sincronização em lote pelo cron.
    me.labels.get("lbl-1")!.status = "delivered";
    me.labels.get("lbl-1")!.delivered_at = "2026-11-12T10:00:00+00:00";
    await db.shipment.updateMany({ data: { lastSyncedAt: new Date(Date.now() - 3_600_000) } });
    expect(await syncOpenShipments()).toEqual({ checked: 1, updated: 1 });
    order = await db.order.findUniqueOrThrow({ where: { id: o.id }, include: { shipment: { include: { events: true } } } });
    expect(order.status).toBe("DELIVERED");
    expect(order.shipment!.events).toHaveLength(2);

    // Nova sincronização: entregue não é consultado de novo.
    await db.shipment.updateMany({ data: { lastSyncedAt: new Date(Date.now() - 3_600_000) } });
    expect(await syncOpenShipments()).toEqual({ checked: 0, updated: 0 });
  });

  it("etiqueta ainda não postada não gera evento", async () => {
    await connect();
    await enable();
    const o = await paidOrderWithTracking("ME000000000BR");
    me.labels.set("lbl-2", { id: "lbl-2", protocol: "ORD-2", status: "released", tracking: "ME000000000BR", posted_at: null, delivered_at: null });
    await linkAndSyncShipment(o.id);
    expect(await db.shipmentEvent.count()).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
  });

  it("entrega direto (sem postagem registrada) passa por Enviado → Entregue", async () => {
    await connect();
    await enable();
    const o = await paidOrderWithTracking("ME111111111BR");
    me.labels.set("lbl-3", { id: "lbl-3", protocol: "ORD-3", status: "delivered", tracking: "ME111111111BR", posted_at: null, delivered_at: "2026-11-12 09:00:00" });
    await linkAndSyncShipment(o.id);
    const history = await db.orderStatusHistory.findMany({ where: { orderId: o.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => h.toStatus)).toEqual(["PENDING_PAYMENT", "SHIPPED", "DELIVERED"]);
  });
});

describe("mapeamento", () => {
  it("status e datas do provedor", () => {
    expect(mapMelhorEnvioStatus("posted")?.status).toBe("POSTED");
    expect(mapMelhorEnvioStatus("undelivered")?.status).toBe("FAILED");
    expect(mapMelhorEnvioStatus("released")).toBeNull();
    expect(mapMelhorEnvioStatus("canceled")).toBeNull();
    expect(parseProviderDate("2026-01-01 00:00:00")?.toISOString()).toBe("2026-01-01T03:00:00.000Z");
    expect(parseProviderDate("2026-01-01T00:00:00+00:00")?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(parseProviderDate("lixo")).toBeNull();
  });
});
