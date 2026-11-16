import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ConflictError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashPassword, verifyDummyPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeAllUserSessions } from "@/lib/auth/session";
import { generateToken, hashIp, sha256 } from "@/lib/security/crypto";
import { audit } from "./audit";
import { passwordResetEmail, sendMail } from "./mail";

export const POLICY_VERSION = "2026-11";
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MS = 30 * 60 * 1000;

interface Ctx {
  ip: string;
  userAgent: string | null;
}

export async function registerUser(input: { name: string; email: string; password: string; marketingOptIn: boolean }, ctx: Ctx) {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new ConflictError("Não foi possível concluir o cadastro com este e-mail. Se já possui conta, faça login ou recupere sua senha.", "EMAIL_UNAVAILABLE");

  const passwordHash = await hashPassword(input.password);
  const ipHash = hashIp(ctx.ip);
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      consents: {
        create: [
          { type: "TERMS", version: POLICY_VERSION, granted: true, ipHash, userAgent: ctx.userAgent },
          { type: "PRIVACY", version: POLICY_VERSION, granted: true, ipHash, userAgent: ctx.userAgent },
          { type: "MARKETING", version: POLICY_VERSION, granted: input.marketingOptIn, ipHash, userAgent: ctx.userAgent },
        ],
      },
    },
    select: { id: true, role: true },
  });
  await createSession(user, ctx);
  await audit({ actorId: user.id, action: "auth.register", entityType: "User", entityId: user.id, ip: ctx.ip });
  return user;
}

const GENERIC_LOGIN_ERROR = "E-mail ou senha incorretos.";

export async function loginUser(input: { email: string; password: string }, ctx: Ctx) {
  const user = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true, passwordHash: true, failedLoginCount: true, lockedUntil: true, anonymizedAt: true },
  });

  if (!user || user.anonymizedAt) {
    await verifyDummyPassword(input.password); // tempo de resposta equivalente
    throw new UnauthorizedError(GENERIC_LOGIN_ERROR);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    // Mesmo bloqueada, não revela se a senha estava certa.
    await verifyDummyPassword(input.password);
    throw new UnauthorizedError("Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em alguns minutos ou redefina sua senha.");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : undefined },
    });
    if (lock) await audit({ actorId: user.id, action: "auth.account_locked", entityType: "User", entityId: user.id, ip: ctx.ip });
    throw new UnauthorizedError(GENERIC_LOGIN_ERROR);
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user, ctx);
  await audit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id, ip: ctx.ip });
  return user;
}

/** Sempre responde igual (não revela se o e-mail existe). */
export async function requestPasswordReset(email: string, ctx: Ctx): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, anonymizedAt: true } });
  if (!user || user.anonymizedAt) {
    logger.info("auth.reset_unknown_email");
    return;
  }
  const token = generateToken();
  await db.$transaction([
    db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);
  const link = `${env().APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await sendMail({ to: user.email, ...passwordResetEmail(user.name, link) });
  await audit({ actorId: user.id, action: "auth.reset_requested", entityType: "User", entityId: user.id, ip: ctx.ip });
}

export async function resetPassword(token: string, newPassword: string, ctx: Ctx): Promise<void> {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw new ValidationError("Link inválido ou expirado. Solicite uma nova redefinição.");

  const passwordHash = await hashPassword(newPassword);
  // Marca como usado de forma condicional: impede reutilização em requisições simultâneas.
  const consumed = await db.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (consumed.count !== 1) throw new ValidationError("Link inválido ou expirado. Solicite uma nova redefinição.");

  await db.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } });
  await revokeAllUserSessions(record.userId); // encerra sessões possivelmente comprometidas
  await audit({ actorId: record.userId, action: "auth.password_reset", entityType: "User", entityId: record.userId, ip: ctx.ip });
}

export async function changePassword(userId: string, sessionId: string, current: string, next: string, ctx: Ctx): Promise<void> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(user.passwordHash, current))) throw new ValidationError("Senha atual incorreta.");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await revokeAllUserSessions(userId, sessionId);
  await audit({ actorId: userId, action: "auth.password_changed", entityType: "User", entityId: userId, ip: ctx.ip });
}
