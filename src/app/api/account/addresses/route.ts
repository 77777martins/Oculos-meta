import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { addressSchema } from "@/lib/validation/address";

const MAX_ADDRESSES = 10;

export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  const addresses = await db.address.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], omit: { userId: true } });
  return ok(addresses);
});

export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.account, user.id);
  const input = await parseJson(req, addressSchema);
  const count = await db.address.count({ where: { userId: user.id, deletedAt: null } });
  if (count >= MAX_ADDRESSES) throw new ConflictError(`Limite de ${MAX_ADDRESSES} endereços atingido.`);
  const makeDefault = input.isDefault || count === 0;
  const address = await db.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, isDefault: makeDefault, userId: user.id }, omit: { userId: true } });
  });
  return ok(address, { status: 201 });
});
