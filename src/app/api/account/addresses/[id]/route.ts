import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { addressSchema } from "@/lib/validation/address";
import { idSchema } from "@/lib/validation/common";

async function findOwned(userId: string, rawId: string) {
  const id = idSchema.safeParse(rawId);
  if (!id.success) throw new NotFoundError("Endereço não encontrado.");
  // Filtra pelo dono: um usuário nunca acessa endereço de outro (anti-IDOR).
  const address = await db.address.findFirst({ where: { id: id.data, userId, deletedAt: null } });
  if (!address) throw new NotFoundError("Endereço não encontrado.");
  return address;
}

export const PUT = apiHandler<{ id: string }>(async (req, { params }) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.account, user.id);
  const address = await findOwned(user.id, (await params).id);
  const input = await parseJson(req, addressSchema);
  const updated = await db.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId: user.id, isDefault: true, id: { not: address.id } }, data: { isDefault: false } });
    return tx.address.update({ where: { id: address.id }, data: { ...input, isDefault: input.isDefault || address.isDefault }, omit: { userId: true } });
  });
  return ok(updated);
});

export const DELETE = apiHandler<{ id: string }>(async (_req, { params }) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.account, user.id);
  const address = await findOwned(user.id, (await params).id);
  await db.address.update({ where: { id: address.id }, data: { deletedAt: new Date(), isDefault: false } });
  return ok({ success: true });
});
