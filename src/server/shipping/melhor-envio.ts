import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { decimalToCents } from "@/lib/money";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

/**
 * Cliente da API do Melhor Envio (v2), conforme a documentação oficial
 * (docs.melhorenvio.com.br):
 * - OAuth2 com aplicativo: token de 30 dias + refresh_token de 45 dias;
 *   ao receber 401, renova o token e repete a requisição uma vez.
 * - User-Agent obrigatório com nome da aplicação e e-mail técnico.
 * - Dimensões em cm, peso em kg, valores em reais.
 * Toda resposta externa é validada com Zod antes de ser usada.
 */

export const PROVIDER = "MELHOR_ENVIO";
/** Cookie HttpOnly com o `state` do OAuth (proteção CSRF do fluxo de autorização). */
export const OAUTH_STATE_COOKIE = "oms_me_oauth_state";
/** Somente as permissões necessárias (orientação da documentação). */
export const SCOPES = ["shipping-calculate", "orders-read", "shipping-tracking"] as const;

export class MelhorEnvioError extends AppError {
  constructor(message: string, status = 502) {
    super(message, status, "SHIPPING_PROVIDER_ERROR");
  }
}

export function melhorEnvioBaseUrl(): string {
  return env().MELHORENVIO_ENV === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br";
}

export function isMelhorEnvioConfigured(): boolean {
  const e = env();
  return Boolean(e.MELHORENVIO_CLIENT_ID && e.MELHORENVIO_CLIENT_SECRET && e.MELHORENVIO_USER_AGENT);
}

export function callbackUrl(): string {
  return `${env().APP_URL}/api/integrations/melhor-envio/callback`;
}

export function authorizeUrl(state: string): string {
  const e = env();
  const params = new URLSearchParams({
    client_id: e.MELHORENVIO_CLIENT_ID ?? "",
    redirect_uri: callbackUrl(),
    response_type: "code",
    state,
    scope: SCOPES.join(" "),
  });
  return `${melhorEnvioBaseUrl()}/oauth/authorize?${params.toString()}`;
}

function headers(token?: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": env().MELHORENVIO_USER_AGENT ?? "Oculos Meta Store",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// -----------------------------------------------------------------------------
// Tokens
// -----------------------------------------------------------------------------

const tokenResponse = z.object({
  token_type: z.string(),
  expires_in: z.number().int().positive(),
  access_token: z.string().min(10),
  refresh_token: z.string().min(10),
});

async function requestToken(body: Record<string, unknown>) {
  const e = env();
  const res = await fetch(`${melhorEnvioBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ client_id: Number(e.MELHORENVIO_CLIENT_ID), client_secret: e.MELHORENVIO_CLIENT_SECRET, ...body }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json().catch(() => null);
  const parsed = tokenResponse.safeParse(json);
  if (!res.ok || !parsed.success) {
    logger.error("melhorenvio.token_failed", { status: res.status, grant: body.grant_type });
    throw new MelhorEnvioError("Não foi possível autenticar com o Melhor Envio.", 502);
  }
  return parsed.data;
}

async function saveTokens(t: z.infer<typeof tokenResponse>, connectedById?: string) {
  const data = {
    environment: env().MELHORENVIO_ENV,
    accessTokenEnc: encryptSecret(t.access_token),
    refreshTokenEnc: encryptSecret(t.refresh_token),
    expiresAt: new Date(Date.now() + t.expires_in * 1000),
    scope: SCOPES.join(" "),
  };
  await db.integrationCredential.upsert({
    where: { provider: PROVIDER },
    create: { provider: PROVIDER, ...data, connectedById: connectedById ?? null },
    update: { ...data, ...(connectedById ? { connectedById } : {}) },
  });
}

export async function exchangeAuthorizationCode(code: string, connectedById: string): Promise<void> {
  const t = await requestToken({ grant_type: "authorization_code", redirect_uri: callbackUrl(), code });
  await saveTokens(t, connectedById);
}

export async function disconnectMelhorEnvio(): Promise<void> {
  await db.integrationCredential.deleteMany({ where: { provider: PROVIDER } });
}

export async function getConnectionStatus() {
  const cred = await db.integrationCredential.findUnique({ where: { provider: PROVIDER }, select: { environment: true, expiresAt: true, updatedAt: true } });
  return {
    configured: isMelhorEnvioConfigured(),
    connected: Boolean(cred && cred.environment === env().MELHORENVIO_ENV),
    environment: env().MELHORENVIO_ENV,
    expiresAt: cred?.expiresAt ?? null,
    environmentMismatch: Boolean(cred && cred.environment !== env().MELHORENVIO_ENV),
  };
}

async function refreshTokens(previousAccessEnc: string): Promise<string> {
  const cred = await db.integrationCredential.findUnique({ where: { provider: PROVIDER } });
  if (!cred) throw new MelhorEnvioError("Melhor Envio não conectado.", 503);
  // Outra instância já renovou: usa o token novo (evita invalidar o refresh_token em corrida).
  if (cred.accessTokenEnc !== previousAccessEnc) return decryptSecret(cred.accessTokenEnc);
  const t = await requestToken({ grant_type: "refresh_token", refresh_token: decryptSecret(cred.refreshTokenEnc) });
  await saveTokens(t);
  return t.access_token;
}

async function currentToken(): Promise<{ token: string; enc: string }> {
  const cred = await db.integrationCredential.findUnique({ where: { provider: PROVIDER } });
  if (!cred || cred.environment !== env().MELHORENVIO_ENV) throw new MelhorEnvioError("Melhor Envio não conectado.", 503);
  // Renovação preventiva quando faltar menos de 1 dia.
  if (cred.expiresAt.getTime() - Date.now() < 86_400_000) {
    const token = await refreshTokens(cred.accessTokenEnc);
    return { token, enc: (await db.integrationCredential.findUniqueOrThrow({ where: { provider: PROVIDER } })).accessTokenEnc };
  }
  return { token: decryptSecret(cred.accessTokenEnc), enc: cred.accessTokenEnc };
}

/** Requisição autenticada com uma nova tentativa após renovar o token em caso de 401. */
async function apiRequest(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<unknown> {
  if (!isMelhorEnvioConfigured()) throw new ServiceUnavailableError("Integração com o Melhor Envio não configurada.");
  let { token, enc } = await currentToken();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${melhorEnvioBaseUrl()}${path}`, {
      method: init.method,
      headers: headers(token),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401 && attempt === 0) {
      token = await refreshTokens(enc);
      enc = (await db.integrationCredential.findUniqueOrThrow({ where: { provider: PROVIDER } })).accessTokenEnc;
      continue;
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      logger.error("melhorenvio.request_failed", { path: path.split("?")[0], status: res.status });
      throw new MelhorEnvioError("O Melhor Envio não respondeu como esperado.", res.status >= 500 ? 503 : 502);
    }
    return json;
  }
  throw new MelhorEnvioError("Falha de autenticação com o Melhor Envio. Reconecte a integração no painel.", 503);
}

// -----------------------------------------------------------------------------
// Cotação (POST /api/v2/me/shipment/calculate)
// -----------------------------------------------------------------------------

const money = z.union([z.string(), z.number()]).transform((v) => Number(v));
const range = z.object({ min: z.number(), max: z.number() }).partial().nullish();

const quoteItem = z.object({
  id: z.number().int(),
  name: z.string(),
  price: money.optional(),
  custom_price: money.optional(),
  delivery_time: z.number().nullish(),
  custom_delivery_time: z.number().nullish(),
  delivery_range: range,
  custom_delivery_range: range,
  company: z.object({ id: z.number().nullish(), name: z.string() }).partial().nullish(),
  error: z.string().nullish(),
});

export interface MelhorEnvioQuote {
  serviceId: number;
  serviceName: string;
  carrier: string;
  priceCents: number;
  minDays: number;
  maxDays: number;
}

export interface QuoteProduct {
  id: string;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  weightKg: number;
  insuranceValue: number;
  quantity: number;
}

export async function quoteShipping(input: { fromZip: string; toZip: string; products: QuoteProduct[] }): Promise<MelhorEnvioQuote[]> {
  const json = await apiRequest("/api/v2/me/shipment/calculate", {
    method: "POST",
    body: {
      from: { postal_code: input.fromZip },
      to: { postal_code: input.toZip },
      products: input.products.map((p) => ({
        id: p.id,
        width: p.widthCm,
        height: p.heightCm,
        length: p.lengthCm,
        weight: p.weightKg,
        insurance_value: p.insuranceValue,
        quantity: p.quantity,
      })),
    },
  });
  const parsed = z.array(z.unknown()).safeParse(json);
  if (!parsed.success) throw new MelhorEnvioError("Resposta de cotação inválida.");

  const quotes: MelhorEnvioQuote[] = [];
  for (const raw of parsed.data) {
    const item = quoteItem.safeParse(raw);
    if (!item.success || item.data.error) continue; // serviço indisponível para este trecho
    const q = item.data;
    // Recomendação oficial: usar os campos "custom_*" (refletem ajustes configurados no app).
    const price = q.custom_price ?? q.price;
    const r = q.custom_delivery_range ?? q.delivery_range;
    const days = q.custom_delivery_time ?? q.delivery_time;
    if (price === undefined || !Number.isFinite(price) || price < 0) continue;
    const minDays = r?.min ?? days ?? null;
    const maxDays = r?.max ?? days ?? null;
    if (minDays === null || maxDays === null) continue;
    quotes.push({ serviceId: q.id, serviceName: q.name, carrier: q.company?.name ?? "Transportadora", priceCents: decimalToCents(price), minDays, maxDays });
  }
  return quotes.sort((a, b) => a.priceCents - b.priceCents || a.maxDays - b.maxDays);
}

// -----------------------------------------------------------------------------
// Etiquetas e rastreio
// -----------------------------------------------------------------------------

const labelSchema = z.object({
  id: z.string().min(1),
  protocol: z.string().nullish(),
  status: z.string(),
  tracking: z.string().nullish(),
  posted_at: z.string().nullish(),
  delivered_at: z.string().nullish(),
  canceled_at: z.string().nullish(),
});
export type MelhorEnvioLabel = z.infer<typeof labelSchema>;

/** GET /api/v2/me/orders/search?q= — localiza a etiqueta pelo código de rastreio. */
export async function findLabelByTracking(trackingCode: string): Promise<MelhorEnvioLabel | null> {
  if (!/^[A-Z0-9-]{4,60}$/.test(trackingCode)) return null;
  const json = await apiRequest(`/api/v2/me/orders/search?q=${encodeURIComponent(trackingCode)}`, { method: "GET" });
  const list = z.array(z.unknown()).safeParse(json);
  if (!list.success) return null;
  for (const raw of list.data) {
    const label = labelSchema.safeParse(raw);
    if (label.success && label.data.tracking?.toUpperCase() === trackingCode.toUpperCase()) return label.data;
  }
  return null;
}

/** POST /api/v2/me/shipment/tracking — status atual de várias etiquetas. */
export async function trackLabels(ids: string[]): Promise<Map<string, MelhorEnvioLabel>> {
  const result = new Map<string, MelhorEnvioLabel>();
  if (ids.length === 0) return result;
  const json = await apiRequest("/api/v2/me/shipment/tracking", { method: "POST", body: { orders: ids } });
  const record = z.record(z.string(), z.unknown()).safeParse(json);
  if (!record.success) return result;
  for (const [id, raw] of Object.entries(record.data)) {
    const label = labelSchema.safeParse(raw);
    if (label.success) result.set(id, label.data);
  }
  return result;
}
