import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bulkVariantUpdateSchema } from "@/lib/validation/catalog";
import { bulkUpdateVariants } from "@/server/services/bulk-variants";
import { createProduct, createUser, resetDb } from "../helpers/db";

beforeEach(resetDb);

describe("edição em massa de preço e estoque", () => {
  it("atualiza preço e transforma estoque em movimento do livro-razão", async () => {
    const [admin, product] = await Promise.all([createUser({ role: "ADMIN" }), createProduct({ stock: 5, priceCents: 300_00 })]);
    const v = product.variants[0]!;
    const res = await bulkUpdateVariants({ reason: "Preços reais", items: [{ variantId: v.id, priceCents: 329_900, salePriceCents: 299_900, stock: 12 }] }, admin.id, "127.0.0.1");
    expect(res.changed).toBe(1);
    const after = await db.productVariant.findUniqueOrThrow({ where: { id: v.id } });
    expect(after).toMatchObject({ priceCents: 329_900, salePriceCents: 299_900, stock: 12 });
    const moves = await db.inventoryMovement.findMany({ where: { variantId: v.id, reason: "Preços reais" } });
    expect(moves.map((m) => m.quantity)).toEqual([7]);
    expect(await db.auditLog.count({ where: { action: "variant.bulk_update", entityId: v.id } })).toBe(1);
  });

  it("linhas sem mudança são ignoradas", async () => {
    const [admin, product] = await Promise.all([createUser({ role: "ADMIN" }), createProduct({ stock: 5, priceCents: 300_00 })]);
    const v = product.variants[0]!;
    const res = await bulkUpdateVariants({ reason: "Nada", items: [{ variantId: v.id, priceCents: v.priceCents, salePriceCents: v.salePriceCents, stock: v.stock }] }, admin.id, "127.0.0.1");
    expect(res.changed).toBe(0);
  });

  it("tudo ou nada: estoque abaixo do reservado cancela a operação inteira", async () => {
    const [admin, a, b] = await Promise.all([createUser({ role: "ADMIN" }), createProduct({ stock: 5, priceCents: 300_00 }), createProduct({ stock: 5, priceCents: 300_00 })]);
    await db.productVariant.update({ where: { id: b.variants[0]!.id }, data: { reserved: 3 } });
    await expect(
      bulkUpdateVariants(
        {
          reason: "Teste",
          items: [
            { variantId: a.variants[0]!.id, priceCents: 999_00, salePriceCents: null, stock: 50 },
            { variantId: b.variants[0]!.id, priceCents: 300_00, salePriceCents: null, stock: 1 },
          ],
        },
        admin.id,
        "127.0.0.1",
      ),
    ).rejects.toMatchObject({ code: "INVALID_ADJUSTMENT" });
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: a.variants[0]!.id } })).toMatchObject({ priceCents: 300_00, stock: 5 });
  });

  it("variante inexistente → nada é salvo", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await expect(bulkUpdateVariants({ reason: "x x x", items: [{ variantId: "ckv1234567890abcdefghij", priceCents: 100, salePriceCents: null, stock: 1 }] }, admin.id, "1.1.1.1")).rejects.toMatchObject({ status: 404 });
  });

  it("validação: promoção maior que o preço, estoque negativo e campos extras", () => {
    const item = { variantId: "ckv1234567890abcdefghij", priceCents: 100_00, salePriceCents: null, stock: 1 };
    expect(bulkVariantUpdateSchema.safeParse({ reason: "ok ok", items: [item] }).success).toBe(true);
    expect(bulkVariantUpdateSchema.safeParse({ reason: "ok ok", items: [{ ...item, salePriceCents: 200_00 }] }).success).toBe(false);
    expect(bulkVariantUpdateSchema.safeParse({ reason: "ok ok", items: [{ ...item, stock: -1 }] }).success).toBe(false);
    expect(bulkVariantUpdateSchema.safeParse({ reason: "ok ok", items: [{ ...item, reserved: 0 }] }).success).toBe(false);
    expect(bulkVariantUpdateSchema.safeParse({ reason: "ok ok", items: [] }).success).toBe(false);
  });
});
