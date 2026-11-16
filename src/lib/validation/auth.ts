import { z } from "zod";
import { cleanText, emailSchema } from "./common";

export const passwordSchema = z
  .string({ error: "Informe a senha." })
  .min(10, "A senha deve ter no mínimo 10 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "Use letras maiúsculas, minúsculas e números.");

export const registerSchema = z.strictObject({
  name: cleanText(120, 2),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: "Você precisa aceitar os Termos e a Política de Privacidade." }),
  marketingOptIn: z.boolean().optional().default(false),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  // Sem regras de complexidade no login: apenas limites de tamanho.
  password: z.string().min(1, "Informe a senha.").max(128),
});

export const forgotPasswordSchema = z.strictObject({ email: emailSchema });

export const resetPasswordSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,64}$/, "Link inválido ou expirado."),
  password: passwordSchema,
});

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1, "Informe a senha atual.").max(128),
  newPassword: passwordSchema,
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
