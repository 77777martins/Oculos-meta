import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Token aleatório criptograficamente seguro (256 bits), seguro para URL. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(value: string, secret = env().AUTH_SECRET): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * IPs são dado pessoal (LGPD). Guardamos apenas um HMAC — suficiente para
 * correlacionar abuso, impossível de reverter sem o segredo.
 */
export function hashIp(ip: string | null | undefined): string | null {
  return ip ? hmacSha256(`ip:${ip}`).slice(0, 64) : null;
}

// -----------------------------------------------------------------------------
// Criptografia simétrica para segredos guardados no banco (tokens OAuth).
// AES-256-GCM (confidencialidade + integridade) com chave derivada do
// AUTH_SECRET via HKDF e contexto próprio. Formato: v1.<iv>.<tag>.<cifra>
// Observação: trocar o AUTH_SECRET invalida os tokens — basta reconectar a integração.
// -----------------------------------------------------------------------------
function encryptionKey(context: string): Buffer {
  return Buffer.from(hkdfSync("sha256", env().AUTH_SECRET, "oms-encryption-salt-v1", context, 32));
}

export function encryptSecret(plain: string, context = "integration-tokens"): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(context), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, context = "integration-tokens"): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Formato de segredo inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(context), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
