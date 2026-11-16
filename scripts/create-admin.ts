/**
 * Cria (ou promove) o administrador inicial.
 * Uso: ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... npm run admin:create
 * A senha nunca é impressa e deve seguir a política (10+ caracteres, maiúsc., minúsc., números).
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { ARGON2_OPTIONS } from "../src/lib/auth/argon-options";
import { passwordSchema } from "../src/lib/validation/auth";
import { emailSchema } from "../src/lib/validation/common";

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? "");
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? "");
  const name = (process.env.ADMIN_NAME ?? "Administrador").trim().slice(0, 120);
  if (!email.success) throw new Error("ADMIN_EMAIL inválido ou ausente.");
  if (!password.success) throw new Error(`ADMIN_PASSWORD fraca: ${password.error.issues[0]?.message}`);

  const db = new PrismaClient();
  try {
    const passwordHash = await hash(password.data, ARGON2_OPTIONS);
    const user = await db.user.upsert({
      where: { email: email.data },
      create: { email: email.data, name, passwordHash, role: "ADMIN" },
      update: { role: "ADMIN", passwordHash, failedLoginCount: 0, lockedUntil: null },
      select: { id: true, email: true },
    });
    await db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await db.auditLog.create({ data: { actorId: user.id, action: "staff.bootstrap_admin", entityType: "User", entityId: user.id } });
    console.log(`Administrador pronto: ${user.email}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
