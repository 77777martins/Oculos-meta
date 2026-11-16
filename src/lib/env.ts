import "server-only";
import { z } from "zod";

/**
 * Variáveis de ambiente do SERVIDOR, validadas na primeira leitura.
 * Nunca importe este módulo em Client Components (o "server-only" impede).
 *
 * Integrações externas (Mercado Pago, Resend, Blob) são opcionais em
 * desenvolvimento, mas o código que depende delas falha de forma explícita
 * e segura quando não configuradas — nunca simula sucesso.
 */
const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().transform((v) => v.replace(/\/+$/, "")),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET deve ter pelo menos 32 caracteres"),
  CRON_SECRET: optional,
  MERCADOPAGO_ACCESS_TOKEN: optional,
  MERCADOPAGO_WEBHOOK_SECRET: optional,
  MERCADOPAGO_STATEMENT_DESCRIPTOR: z.string().max(13).default("OCULOSMETA"),
  NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("Óculos Meta Store <nao-responda@localhost>"),
  BLOB_READ_WRITE_TOKEN: optional,
  MELHORENVIO_CLIENT_ID: optional,
  MELHORENVIO_CLIENT_SECRET: optional,
  MELHORENVIO_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  /** Obrigatório pelo Melhor Envio: "Nome da aplicação (email de contato técnico)". */
  MELHORENVIO_USER_AGENT: optional,
  /** Implantação de demonstração: aviso fixo no site e bloqueio de indexação. */
  DEMO_MODE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Mostra apenas NOMES das variáveis inválidas — nunca valores.
    const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Variáveis de ambiente inválidas: ${fields}`);
  }
  if (parsed.data.NODE_ENV === "production") {
    const missing = (["CRON_SECRET", "MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_SECRET", "RESEND_API_KEY", "BLOB_READ_WRITE_TOKEN"] as const).filter(
      (k) => !parsed.data[k],
    );
    if (missing.length > 0) {
      // Não derruba o build, mas deixa explícito nos logs de produção.
      console.error(JSON.stringify({ level: "error", msg: "Variáveis de produção ausentes", missing }));
    }
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => process.env.NODE_ENV === "production";
