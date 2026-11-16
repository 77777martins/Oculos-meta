import { PrismaClient } from "@prisma/client";

/**
 * Zera os contadores de rate limit antes da suíte E2E (várias execuções
 * seguidas do mesmo IP atingiriam o limite de cadastros, que é o comportamento
 * correto em produção). Recusa rodar contra produção.
 */
export default async function globalSetup() {
  if (process.env.NODE_ENV === "production" || /prod/i.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("E2E não deve ser executado contra o banco de produção.");
  }
  const db = new PrismaClient();
  try {
    await db.rateLimitBucket.deleteMany();
  } finally {
    await db.$disconnect();
  }
}
