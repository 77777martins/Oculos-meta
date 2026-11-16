import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma. Em desenvolvimento o hot-reload recriaria o cliente
 * a cada alteração e esgotaria as conexões — por isso guardamos em globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
