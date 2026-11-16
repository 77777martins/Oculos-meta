import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { centsToDecimal } from "@/lib/money";
import { getConnectionStatus, isMelhorEnvioConfigured, quoteShipping, type MelhorEnvioQuote, type QuoteProduct } from "@/server/shipping/melhor-envio";
import { shippingOptionsForZip, type ShippingOption } from "./pricing";
import { getStoreSettings } from "./settings";

export const SHIPPING_OPTION_ID = /^(zone_[a-z0-9]{20,32}|me_\d{1,6})$/;

export interface ShippingContext {
  zipCode: string;
  subtotalCents: number;
  lines: Array<{ variantId: string; quantity: number; unitPriceCents: number; weightGrams: number }>;
}

// Cache curto em memória por instância: evita cotar repetidamente o mesmo carrinho
// (o carrinho recalcula a cada alteração). Valores sempre gerados pelo servidor.
const QUOTE_TTL_MS = 10 * 60_000;
const quoteCache = new Map<string, { expires: number; quotes: MelhorEnvioQuote[] }>();

async function melhorEnvioOptions(ctx: ShippingContext, settings: Awaited<ReturnType<typeof getStoreSettings>>): Promise<ShippingOption[] | null> {
  if (!settings.melhorEnvioEnabled || !settings.shippingOriginZip || !isMelhorEnvioConfigured()) return null;
  if (!(await getConnectionStatus()).connected) return null;

  const products: QuoteProduct[] = ctx.lines
    .filter((l) => l.quantity > 0)
    .map((l) => ({
      id: l.variantId,
      widthCm: settings.packageWidthCm,
      heightCm: settings.packageHeightCm,
      lengthCm: settings.packageLengthCm,
      weightKg: Math.max(0.01, l.weightGrams / 1000),
      insuranceValue: centsToDecimal(l.unitPriceCents),
      quantity: l.quantity,
    }));
  if (products.length === 0) return [];

  const key = JSON.stringify([settings.shippingOriginZip, ctx.zipCode, products, settings.packageWidthCm, settings.packageHeightCm, settings.packageLengthCm]);
  const cached = quoteCache.get(key);
  let quotes: MelhorEnvioQuote[];
  if (cached && cached.expires > Date.now()) {
    quotes = cached.quotes;
  } else {
    quotes = await quoteShipping({ fromZip: settings.shippingOriginZip, toZip: ctx.zipCode, products });
    if (quoteCache.size > 500) quoteCache.clear();
    quoteCache.set(key, { expires: Date.now() + QUOTE_TTL_MS, quotes });
  }

  return quotes.map((q) => ({
    id: `me_${q.serviceId}`,
    provider: "MELHOR_ENVIO" as const,
    zoneId: null,
    serviceId: q.serviceId,
    name: q.serviceName,
    carrier: q.carrier,
    serviceName: q.serviceName,
    priceCents: q.priceCents,
    minDays: q.minDays,
    maxDays: q.maxDays,
    isFree: q.priceCents === 0,
  }));
}

async function tableOptions(ctx: ShippingContext): Promise<ShippingOption[]> {
  const zip = Number(ctx.zipCode);
  const zones = await db.shippingZone.findMany({ where: { isActive: true, zipStart: { lte: zip }, zipEnd: { gte: zip } } });
  return shippingOptionsForZip(zones, ctx.zipCode, ctx.subtotalCents);
}

/**
 * Opções de frete calculadas SEMPRE no servidor.
 * Melhor Envio (quando habilitado e conectado) com a tabela por CEP como reserva
 * em caso de falha ou ausência de serviços para o trecho.
 */
export async function getShippingOptions(ctx: ShippingContext): Promise<ShippingOption[]> {
  if (!/^\d{8}$/.test(ctx.zipCode)) return [];
  const settings = await getStoreSettings();
  try {
    const me = await melhorEnvioOptions(ctx, settings);
    if (me && me.length > 0) return me;
  } catch (error) {
    logger.warn("shipping.melhorenvio_fallback", { error });
  }
  return tableOptions(ctx);
}

/** Recalcula as opções e devolve a escolhida (nunca confia em preço enviado pelo cliente). */
export async function resolveShippingOption(optionId: string, ctx: ShippingContext): Promise<ShippingOption | null> {
  if (!SHIPPING_OPTION_ID.test(optionId)) return null;
  const options = await getShippingOptions(ctx);
  return options.find((o) => o.id === optionId) ?? null;
}

export interface CepLookup {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
}

/**
 * Consulta de CEP via ViaCEP (serviço público). Host fixo e entrada só com
 * dígitos — não há como um atacante direcionar a requisição (anti-SSRF).
 */
export async function lookupCep(zipCode: string): Promise<CepLookup | null> {
  if (!/^\d{8}$/.test(zipCode)) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data.erro) return null;
    const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 160) : "");
    return { zipCode, street: str(data.logradouro), district: str(data.bairro), city: str(data.localidade), state: str(data.uf).slice(0, 2) };
  } catch (error) {
    logger.warn("cep.lookup_failed", { error });
    return null;
  }
}
