import { z } from "zod";
import { apiHandler, ok, parseJson } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { idSchema } from "@/lib/validation/common";

const schema = z.strictObject({ productId: idSchema });

export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.account, user.id);
  const { productId } = await parseJson(req, schema);
  const product = await db.product.findFirst({ where: { id: productId, status: "PUBLISHED", deletedAt: null }, select: { id: true } });
  if (!product) throw new NotFoundError("Produto não encontrado.");
  await db.favorite.upsert({ where: { userId_productId: { userId: user.id, productId } }, create: { userId: user.id, productId }, update: {} });
  return ok({ favorite: true });
});

export const DELETE = apiHandler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.account, user.id);
  const { productId } = await parseJson(req, schema);
  await db.favorite.deleteMany({ where: { userId: user.id, productId } });
  return ok({ favorite: false });
});
