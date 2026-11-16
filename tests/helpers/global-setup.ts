import { execSync } from "node:child_process";

/** Aplica as migrações no banco de TESTE antes da suíte de integração. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://oculos:oculos_dev@localhost:5432/oculos_meta_test?schema=public";
  if (!/test/i.test(url)) throw new Error("TEST_DATABASE_URL deve apontar para um banco de testes (o nome precisa conter 'test').");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url } });
}
