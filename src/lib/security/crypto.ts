import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
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
