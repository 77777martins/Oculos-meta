import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { shippingOptionsForZip, type ShippingOption } from "./pricing";

export async function getShippingOptions(zipCode: string, subtotalCents: number): Promise<ShippingOption[]> {
  const zip = Number(zipCode);
  const zones = await db.shippingZone.findMany({
    where: { isActive: true, zipStart: { lte: zip }, zipEnd: { gte: zip } },
  });
  return shippingOptionsForZip(zones, zipCode, subtotalCents);
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
