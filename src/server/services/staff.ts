import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { audit } from "./audit";

/**
 * Alteração de papéis com salvaguardas:
 * - ninguém altera o próprio papel (evita auto-escalonamento/bloqueio acidental);
 * - sempre resta ao menos um ADMIN;
 * - as sessões do usuário afetado são revogadas (novos privilégios exigem novo login).
 */
export async function setUserRole(input: { targetId: string; role: Role; actorId: string; ip: string }) {
  if (input.targetId === input.actorId) throw new ValidationError("Você não pode alterar o seu próprio papel.");
  const target = await db.user.findUnique({ where: { id: input.targetId }, select: { id: true, role: true, anonymizedAt: true } });
  if (!target || target.anonymizedAt) throw new NotFoundError("Usuário não encontrado.");
  if (target.role === "ADMIN" && input.role !== "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", anonymizedAt: null } });
    if (admins <= 1) throw new ConflictError("É necessário manter ao menos um administrador.");
  }
  await db.user.update({ where: { id: target.id }, data: { role: input.role } });
  await revokeAllUserSessions(target.id);
  await audit({ actorId: input.actorId, action: "staff.role_change", entityType: "User", entityId: target.id, metadata: { from: target.role, to: input.role }, ip: input.ip });
}

export async function promoteByEmail(input: { email: string; role: Role; actorId: string; ip: string }) {
  const user = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (!user) throw new NotFoundError("Nenhuma conta com este e-mail. Peça para a pessoa se cadastrar na loja primeiro.");
  await setUserRole({ targetId: user.id, role: input.role, actorId: input.actorId, ip: input.ip });
}
