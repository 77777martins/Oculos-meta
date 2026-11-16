import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

/** Limpa TODAS as tabelas do banco de teste (ordem irrelevante com CASCADE). */
export async function resetDb() {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function createUser(opts: { role?: "CUSTOMER" | "SUPPORT" | "MANAGER" | "ADMIN"; password?: string; email?: string } = {}) {
  return db.user.create({
    data: {
      email: opts.email ?? `user-${uid()}@example.com`,
      name: "Maria Teste",
      passwordHash: await hashPassword(opts.password ?? "SenhaForte123"),
      role: opts.role ?? "CUSTOMER",
    },
  });
}

export async function createProduct(opts: { stock?: number; priceCents?: number; salePriceCents?: number | null; status?: "PUBLISHED" | "DRAFT" } = {}) {
  const id = uid();
  return db.product.create({
    data: {
      name: `Produto ${id}`,
      slug: `produto-${id}`,
      model: "M1",
      description: "Descrição de teste",
      status: opts.status ?? "PUBLISHED",
      publishedAt: new Date(),
      variants: {
        create: { sku: `SKU-${id}`.toUpperCase(), name: "Preto", priceCents: opts.priceCents ?? 100_00, salePriceCents: opts.salePriceCents ?? null, stock: opts.stock ?? 10 },
      },
    },
    include: { variants: true },
  });
}

export async function createShippingZone(priceCents = 20_00) {
  return db.shippingZone.create({
    data: { name: "Brasil", carrier: "Correios", serviceName: "PAC", zipStart: 1000000, zipEnd: 99999999, priceCents, minDays: 3, maxDays: 8 },
  });
}

export const validAddress = {
  label: null,
  recipient: "Maria Teste",
  zipCode: "01310100",
  street: "Av. Paulista",
  number: "1000",
  complement: null,
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP" as const,
  phone: null,
  isDefault: false,
};

/** CPF válido (dígitos verificadores corretos) usado somente em testes. */
export const VALID_CPF = "52998224725";
