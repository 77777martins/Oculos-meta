import { z } from "zod";
import { onlyDigits } from "@/lib/utils";

// Mensagens padrão do Zod em português (cliente e servidor).
z.config(z.locales.pt());

/** Validação de CPF com dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export const BR_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

/** Remove caracteres de controle e espaços extras — sanitização básica de texto livre. */
export const cleanText = (max: number, min = 1) =>
  z
    .string({ error: "Campo obrigatório." })
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min, min === 1 ? "Campo obrigatório." : `Mínimo de ${min} caracteres.`).max(max, `Máximo de ${max} caracteres.`));

export const optionalText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .optional()
    .nullable()
    .transform((v) => {
      const t = v?.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
      return t ? t.slice(0, max) : null;
    });

/** Texto longo (mantém quebras de linha). */
export const longText = (max: number, min = 0) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(min, "Campo obrigatório.").max(max, `Máximo de ${max} caracteres.`));

export const emailSchema = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo.")
  .pipe(z.email("E-mail inválido."));

export const cpfSchema = z
  .string({ error: "Informe o CPF." })
  .transform(onlyDigits)
  .refine(isValidCpf, "CPF inválido.");

export const zipSchema = z
  .string({ error: "Informe o CEP." })
  .transform(onlyDigits)
  .refine((v) => v.length === 8, "CEP inválido.");

export const phoneSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido (com DDD).");

export const optionalPhoneSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? onlyDigits(v) : null))
  .refine((v) => v === null || v.length === 10 || v.length === 11, "Telefone inválido (com DDD).");

export const idSchema = z.string().regex(/^[a-z0-9]{20,32}$/i, "Identificador inválido.");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.")
  .max(180);

export const centsSchema = z.number({ error: "Informe um valor." }).int("Valor inválido.").min(0, "Valor não pode ser negativo.").max(100_000_000, "Valor muito alto.");

/** URL http(s) segura — rejeita javascript:, data: etc. (anti-XSS em links/imagens). */
export const safeUrlSchema = z
  .string()
  .trim()
  .max(1024)
  .refine((v) => {
    if (v.startsWith("/") && !v.startsWith("//")) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" || (u.protocol === "http:" && process.env.NODE_ENV !== "production");
    } catch {
      return false;
    }
  }, "URL inválida (use https:// ou um caminho interno iniciado por /).");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  q: z.string().trim().max(100).optional().catch(undefined),
});
