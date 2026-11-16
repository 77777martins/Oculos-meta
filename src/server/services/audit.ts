import "server-only";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { hashIp } from "@/lib/security/crypto";
import { redact } from "@/lib/logger";
import { logger } from "@/lib/logger";

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/** Registra ação sensível. Metadados passam pela redação de dados sensíveis. */
export async function audit(entry: AuditEntry, tx: Tx | typeof db = db): Promise<void> {
  try {
    await tx.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ? (redact(entry.metadata) as Prisma.InputJsonValue) : undefined,
        ipHash: hashIp(entry.ip),
      },
    });
  } catch (error) {
    // Dentro de transação o erro precisa propagar; fora dela, não derruba o fluxo principal.
    if (tx !== db) throw error;
    logger.error("audit.failure", { action: entry.action, error });
  }
}
