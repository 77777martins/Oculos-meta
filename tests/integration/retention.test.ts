import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applyRetentionPolicy, REDACTED_NAME } from "@/server/services/retention";
import { createProduct, createShippingZone, createUser, resetDb, validAddress, VALID_CPF } from "../helpers/db";
import { createOrder } from "@/server/services/orders";

beforeEach(resetDb);

const old = (days: number) => new Date(Date.now() - days * 86_400_000);

async function order(status: "EXPIRED" | "CANCELLED" | "PAID", ageDays: number, paid = false) {
  const [user, product, zone] = await Promise.all([createUser(), createProduct({ stock: 5 }), createShippingZone()]);
  const o = await createOrder({ userId: user.id, items: [{ variantId: product.variants[0]!.id, quantity: 1 }], address: validAddress, shippingOptionId: `zone_${zone.id}`, customerDocument: VALID_CPF, customerPhone: "11999999999" });
  await db.order.update({ where: { id: o.id }, data: { status, createdAt: old(ageDays) } });
  if (paid) await db.payment.create({ data: { orderId: o.id, method: "PIX", status: "APPROVED", amountCents: o.totalCents, idempotencyKey: `k-${o.id}` } });
  return o.id;
}

describe("política de retenção", () => {
  it("anonimiza pedidos NUNCA pagos antigos e preserva os demais", async () => {
    const oldUnpaid = await order("EXPIRED", 200);
    const recentUnpaid = await order("EXPIRED", 30);
    const oldPaidThenCancelled = await order("CANCELLED", 400, true);
    const oldPaid = await order("PAID", 400, true);

    expect((await applyRetentionPolicy()).unpaidOrders).toBe(1);
    const a = await db.order.findUniqueOrThrow({ where: { id: oldUnpaid } });
    expect(a).toMatchObject({ customerName: REDACTED_NAME, customerDocument: "", customerPhone: null });
    expect(a.shippingAddress).toMatchObject({ street: "", zipCode: "" });
    for (const id of [recentUnpaid, oldPaidThenCancelled, oldPaid]) {
      expect((await db.order.findUniqueOrThrow({ where: { id } })).customerDocument).toBe(VALID_CPF);
    }
    // Idempotente: não reprocessa o que já foi anonimizado.
    expect((await applyRetentionPolicy()).unpaidOrders).toBe(0);
  });

  it("remove mensagens, tokens e auditoria fora do prazo", async () => {
    const user = await createUser();
    await db.contactMessage.createMany({
      data: [
        { name: "A", email: "a@ex.com", subject: "Velha", message: "mensagem antiga", createdAt: old(800) },
        { name: "B", email: "b@ex.com", subject: "Nova", message: "mensagem recente", createdAt: old(10) },
      ],
    });
    await db.passwordResetToken.createMany({
      data: [
        { userId: user.id, tokenHash: "h1", expiresAt: old(30) },
        { userId: user.id, tokenHash: "h2", expiresAt: new Date(Date.now() + 600_000) },
      ],
    });
    await db.auditLog.createMany({ data: [{ action: "x", entityType: "Y", createdAt: old(2000) }, { action: "x", entityType: "Y" }] });

    expect(await applyRetentionPolicy()).toMatchObject({ contactMessages: 1, resetTokens: 1, auditLogs: 1 });
    expect((await db.contactMessage.findMany()).map((m) => m.subject)).toEqual(["Nova"]);
    expect(await db.passwordResetToken.count()).toBe(1);
    expect(await db.auditLog.count()).toBe(1);
  });
});
