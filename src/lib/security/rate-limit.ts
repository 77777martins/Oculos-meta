import "server-only";
import { db } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface RateLimitRule {
  /** Identificador lógico: "login:ip", "checkout:user"… */
  name: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  loginIp: { name: "login:ip", limit: 20, windowSeconds: 15 * 60 },
  register: { name: "register:ip", limit: 5, windowSeconds: 60 * 60 },
  forgotIp: { name: "forgot:ip", limit: 5, windowSeconds: 60 * 60 },
  forgotEmail: { name: "forgot:email", limit: 3, windowSeconds: 60 * 60 },
  resetIp: { name: "reset:ip", limit: 10, windowSeconds: 60 * 60 },
  checkout: { name: "checkout:user", limit: 10, windowSeconds: 10 * 60 },
  payment: { name: "payment:user", limit: 15, windowSeconds: 10 * 60 },
  paymentStatus: { name: "payment-status:user", limit: 120, windowSeconds: 10 * 60 },
  quote: { name: "quote:ip", limit: 120, windowSeconds: 10 * 60 },
  coupon: { name: "coupon:ip", limit: 20, windowSeconds: 10 * 60 },
  contact: { name: "contact:ip", limit: 5, windowSeconds: 60 * 60 },
  account: { name: "account:user", limit: 30, windowSeconds: 10 * 60 },
  dataExport: { name: "data-export:user", limit: 3, windowSeconds: 24 * 60 * 60 },
  admin: { name: "admin:user", limit: 300, windowSeconds: 5 * 60 },
  upload: { name: "upload:user", limit: 60, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Rate limit de janela fixa armazenado no PostgreSQL.
 * Uma única instrução atômica (INSERT … ON CONFLICT) evita condições de corrida
 * e funciona entre múltiplas instâncias serverless sem serviço adicional.
 */
export async function consumeRateLimit(rule: RateLimitRule, identifier: string): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const key = `${rule.name}:${identifier}`.slice(0, 200);
  try {
    const rows = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + make_interval(secs => ${rule.windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count", "resetAt"`;
    const row = rows[0]!;
    const retryAfterSeconds = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
    return { allowed: row.count <= rule.limit, remaining: Math.max(0, rule.limit - row.count), retryAfterSeconds };
  } catch (error) {
    // Falha aberta (fail-open) apenas para o limitador: indisponibilidade do contador
    // não deve derrubar a loja. Demais proteções (bloqueio de conta etc.) continuam ativas.
    logger.error("rate_limit.failure", { rule: rule.name, error });
    return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
  }
}

export async function enforceRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  const result = await consumeRateLimit(rule, identifier);
  if (!result.allowed) {
    logger.warn("rate_limit.blocked", { rule: rule.name });
    throw new RateLimitError(result.retryAfterSeconds);
  }
}

/** Limpeza periódica (executada pelo cron) para a tabela não crescer indefinidamente. */
export async function purgeExpiredRateLimits(): Promise<number> {
  const { count } = await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return count;
}
