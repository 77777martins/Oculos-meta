/**
 * Limpa os dados de TESTE antes de abrir a loja: pedidos (com pagamentos, reembolsos,
 * eventos e envios), cupons "DEMO*", faixas de frete "[DEMO]*" e avaliações.
 * O estoque não é "devolvido": o real deve ser lançado depois em Admin > Preços e estoque;
 * aqui só zeramos as unidades reservadas por pedidos de teste.
 *
 * Seguro por padrão: sem --confirm apenas mostra o que SERIA apagado.
 *   npx tsx scripts/cleanup-test-data.ts            (simulação)
 *   npx tsx scripts/cleanup-test-data.ts --confirm  (apaga)
 * Produtos NÃO são apagados (as fotos e cadastros são reaproveitados).
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const confirm = process.argv.includes("--confirm");
  const db = new PrismaClient();
  try {
    const [orders, payments, coupons, zones, reviews] = await Promise.all([
      db.order.count(),
      db.payment.count(),
      db.coupon.count({ where: { code: { startsWith: "DEMO" } } }),
      db.shippingZone.count({ where: { name: { startsWith: "[DEMO]" } } }),
      db.review.count(),
    ]);
    console.log(`Pedidos: ${orders} · Pagamentos: ${payments} · Cupons DEMO: ${coupons} · Fretes [DEMO]: ${zones} · Avaliações: ${reviews}`);
    if (!confirm) {
      console.log("Simulação: nada foi apagado. Rode com --confirm para apagar.");
      return;
    }
    await db.$transaction(async (tx) => {
      // Ordem respeita as chaves estrangeiras com RESTRICT (Refund → Payment → Order).
      await tx.refund.deleteMany({});
      await tx.paymentEvent.deleteMany({});
      await tx.payment.deleteMany({});
      await tx.order.deleteMany({}); // itens, histórico, envio e uso de cupom saem em cascata
      await tx.inventoryMovement.deleteMany({ where: { orderId: { not: null } } });
      await tx.productVariant.updateMany({ data: { reserved: 0 } });
      await tx.coupon.deleteMany({ where: { code: { startsWith: "DEMO" } } });
      await tx.shippingZone.deleteMany({ where: { name: { startsWith: "[DEMO]" } } });
      await tx.review.deleteMany({});
    });
    console.log("Dados de teste apagados. Lance o estoque real em Admin > Preços e estoque.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
