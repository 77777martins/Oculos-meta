import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { generateToken, hashIp, sha256 } from "@/lib/security/crypto";
import { isStaff } from "@/lib/auth/rbac";

/**
 * Sessões opacas armazenadas no banco.
 * - O cookie contém um token aleatório de 256 bits; o banco guarda só o SHA-256.
 *   Um vazamento do banco não permite sequestrar sessões.
 * - Cookie HttpOnly + SameSite=Lax + Secure (produção) + prefixo __Host-.
 * - Sessões podem ser revogadas individualmente ou em massa (troca de senha).
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-oms_session" : "oms_session";

const CUSTOMER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const STAFF_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas para equipe administrativa
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // atualiza lastUsedAt no máximo 1x/hora

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionId: string;
}

export async function createSession(user: { id: string; role: Role }, ctx: { ip: string | null; userAgent: string | null }) {
  const token = generateToken();
  const ttl = isStaff(user.role) ? STAFF_TTL_MS : CUSTOMER_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId: user.id,
      expiresAt,
      userAgent: ctx.userAgent?.slice(0, 512) ?? null,
      ipHash: hashIp(ctx.ip),
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

async function readSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  // Rejeita lixo antes de consultar o banco.
  return token && /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : undefined;
}

/** Usuário da sessão atual (memoizado por requisição com React `cache`). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      user: { select: { id: true, email: true, name: true, role: true, anonymizedAt: true } },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.anonymizedAt) return null;

  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }

  const { id, email, name, role } = session.user;
  return { id, email, name, role, sessionId: session.id };
});

export async function destroyCurrentSession(): Promise<void> {
  const token = await readSessionToken();
  if (token) {
    await db.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}

export async function purgeExpiredSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count } = await db.session.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] } });
  return count;
}
