import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { reviewSchema } from "@/lib/validation/review";
import { deleteAccount } from "@/server/services/privacy";
import { createReview, getProductReviews, getReviewEligibility, moderateReview } from "@/server/services/reviews";
import { createOrder } from "@/server/services/orders";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";

beforeEach(resetDb);

/** Cliente com um pedido do produto no status informado. */
async function buyer(status: "PENDING_PAYMENT" | "PAID" | "DELIVERED", product?: Awaited<ReturnType<typeof createProduct>>) {
  const [user, p, zone] = await Promise.all([createUser(), product ?? createProduct({ stock: 9 }), createShippingZone()]);
  const order = await createOrder({ userId: user.id, items: [{ variantId: p.variants[0]!.id, quantity: 1 }], address: validAddress, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" });
  if (status !== "PENDING_PAYMENT") await db.order.update({ where: { id: order.id }, data: { status } });
  return { user, product: p };
}

const text = "Uso todos os dias, muito confortável.";

describe("avaliações de produto", () => {
  it("só quem recebeu o produto pode avaliar", async () => {
    const product = await createProduct({ stock: 9 });
    const stranger = await createUser();
    const paid = await buyer("PAID", product);
    await expect(createReview({ userId: stranger.id, productId: product.id, rating: 5, comment: text })).rejects.toMatchObject({ status: 403 });
    await expect(createReview({ userId: paid.user.id, productId: product.id, rating: 5, comment: text })).rejects.toMatchObject({ status: 403 });
    expect(await getReviewEligibility(null, product.id)).toBe("LOGIN_REQUIRED");
    expect(await getReviewEligibility(paid.user.id, product.id)).toBe("NOT_PURCHASED");
    expect(await db.review.count()).toBe(0);
  });

  it("fica pendente e só aparece depois de publicada", async () => {
    const { user, product } = await buyer("DELIVERED");
    expect(await getReviewEligibility(user.id, product.id)).toBe("CAN_REVIEW");
    const review = await createReview({ userId: user.id, productId: product.id, rating: 4, comment: text });
    expect(await getReviewEligibility(user.id, product.id)).toBe("PENDING");
    expect((await getProductReviews(product.id)).count).toBe(0);

    await moderateReview(review.id, "PUBLISHED");
    const published = await getProductReviews(product.id);
    expect(published).toMatchObject({ count: 1, average: 4 });
    expect(published.items[0]).toMatchObject({ rating: 4, comment: text, author: user.name.split(" ")[0] });

    await moderateReview(review.id, "REJECTED");
    expect((await getProductReviews(product.id)).count).toBe(0);
  });

  it("uma avaliação por cliente e produto", async () => {
    const { user, product } = await buyer("DELIVERED");
    await createReview({ userId: user.id, productId: product.id, rating: 5, comment: text });
    await expect(createReview({ userId: user.id, productId: product.id, rating: 1, comment: text })).rejects.toMatchObject({ code: "ALREADY_REVIEWED" });
  });

  it("média e distribuição consideram apenas as publicadas", async () => {
    const product = await createProduct({ stock: 9 });
    for (const [rating, publish] of [[5, true], [4, true], [1, false]] as const) {
      const { user } = await buyer("DELIVERED", product);
      const r = await createReview({ userId: user.id, productId: product.id, rating, comment: text });
      if (publish) await moderateReview(r.id, "PUBLISHED");
    }
    const data = await getProductReviews(product.id);
    expect(data).toMatchObject({ count: 2, average: 4.5 });
    expect(data.distribution.find((d) => d.rating === 1)?.count).toBe(0);
  });

  it("validação recusa nota fora de 1–5, comentário curto e campos extras", () => {
    const base = { productId: "ckv1234567890abcdefghij", rating: 5, comment: text };
    expect(reviewSchema.safeParse(base).success).toBe(true);
    expect(reviewSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, rating: 4.5 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, comment: "curto" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, status: "PUBLISHED" }).success).toBe(false);
  });

  it("o banco recusa nota inválida mesmo sem passar pela validação", async () => {
    const { user, product } = await buyer("DELIVERED");
    await expect(db.review.create({ data: { userId: user.id, productId: product.id, rating: 9, comment: text } })).rejects.toThrow();
  });

  it("excluir a conta apaga as avaliações do titular", async () => {
    const { user, product } = await buyer("DELIVERED");
    const r = await createReview({ userId: user.id, productId: product.id, rating: 5, comment: text });
    await moderateReview(r.id, "PUBLISHED");
    await deleteAccount(user.id, "127.0.0.1");
    expect(await db.review.count()).toBe(0);
  });

  it("moderar avaliação inexistente retorna não encontrado", async () => {
    await expect(moderateReview("ckv1234567890abcdefghij", "PUBLISHED")).rejects.toMatchObject({ status: 404 });
  });
});
