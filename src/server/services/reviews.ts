import "server-only";
import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";

/** Só quem recebeu o produto pode avaliar. */
async function hasReceivedProduct(userId: string, productId: string): Promise<boolean> {
  const count = await db.orderItem.count({ where: { productId, order: { userId, status: "DELIVERED" } } });
  return count > 0;
}

export interface ProductReviews {
  count: number;
  average: number;
  /** Quantidade por nota, de 5 a 1. */
  distribution: Array<{ rating: number; count: number }>;
  items: Array<{ id: string; rating: number; comment: string; author: string; createdAt: Date }>;
}

/** Avaliações PUBLICADAS de um produto. Mostra só o primeiro nome do cliente (LGPD: minimização). */
export async function getProductReviews(productId: string, take = 20): Promise<ProductReviews> {
  const where = { productId, status: "PUBLISHED" as const };
  const [groups, rows] = await Promise.all([
    db.review.groupBy({ by: ["rating"], where, _count: { _all: true } }),
    db.review.findMany({ where, orderBy: { createdAt: "desc" }, take, select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true, anonymizedAt: true } } } }),
  ]);
  const count = groups.reduce((sum, g) => sum + g._count._all, 0);
  const total = groups.reduce((sum, g) => sum + g.rating * g._count._all, 0);
  return {
    count,
    average: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: groups.find((g) => g.rating === rating)?._count._all ?? 0 })),
    items: rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, author: r.user.anonymizedAt ? "Cliente" : (r.user.name.split(" ")[0] ?? "Cliente") })),
  };
}

export type ReviewEligibility = "LOGIN_REQUIRED" | "NOT_PURCHASED" | "CAN_REVIEW" | "PENDING" | "PUBLISHED" | "REJECTED";

/** O que mostrar ao visitante no lugar do formulário. */
export async function getReviewEligibility(userId: string | null, productId: string): Promise<ReviewEligibility> {
  if (!userId) return "LOGIN_REQUIRED";
  const existing = await db.review.findUnique({ where: { userId_productId: { userId, productId } }, select: { status: true } });
  if (existing) return existing.status;
  return (await hasReceivedProduct(userId, productId)) ? "CAN_REVIEW" : "NOT_PURCHASED";
}

/** Cria a avaliação como PENDENTE (entra na vitrine só após aprovação da equipe). */
export async function createReview(input: { userId: string; productId: string; rating: number; comment: string }): Promise<{ id: string }> {
  if (!(await hasReceivedProduct(input.userId, input.productId))) throw new ForbiddenError("Só é possível avaliar um produto depois de recebê-lo.");
  const existing = await db.review.findUnique({ where: { userId_productId: { userId: input.userId, productId: input.productId } }, select: { id: true } });
  if (existing) throw new ConflictError("Você já avaliou este produto.", "ALREADY_REVIEWED");
  return db.review.create({ data: input, select: { id: true } });
}

export async function moderateReview(id: string, status: "PUBLISHED" | "REJECTED"): Promise<{ id: string }> {
  const { count } = await db.review.updateMany({ where: { id }, data: { status } });
  if (count === 0) throw new NotFoundError("Avaliação não encontrada.");
  return { id };
}

export async function listReviewsForModeration() {
  return db.review.findMany({
    // Pendentes primeiro (ordem do enum: PENDING, PUBLISHED, REJECTED), depois as mais recentes.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: { id: true, rating: true, comment: true, status: true, createdAt: true, product: { select: { name: true, slug: true } }, user: { select: { name: true, email: true } } },
  });
}
