import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Configurações da loja (linha única). Garante a existência da linha com
 * INSERT … ON CONFLICT DO NOTHING (atômico): o `upsert` do Prisma faz
 * SELECT + INSERT e falha com violação de unicidade sob concorrência.
 */
export const getStoreSettings = cache(async () => {
  const existing = await db.storeSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  await db.$executeRaw`INSERT INTO "StoreSettings" ("id", "updatedAt") VALUES ('default', now()) ON CONFLICT ("id") DO NOTHING`;
  return db.storeSettings.findUniqueOrThrow({ where: { id: "default" } });
});

export type StoreSettingsData = Awaited<ReturnType<typeof getStoreSettings>>;
