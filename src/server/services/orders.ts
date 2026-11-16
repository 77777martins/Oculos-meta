import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AddressData } from "@/lib/validation/address";
import { audit } from "./audit";
import { quoteCartLines } from "./cart";
import { checkCoupon } from "./coupons";
import { commitReservedSale, releaseReservation, reserveStock, returnToStock, tryDirectSale, type StockLine } from "./inventory";
import { canTransition, canTransitionManually } from "./order-state";
import { computeTotals } from "./pricing";
import { getStoreSettings } from "./settings";
import { resolveShippingOption } from "./shipping";
import { notifyOrder } from "./notifications";

/** Limite de pedidos aguardando pagamento por cliente (evita travar estoque por abuso). */
export const MAX_PENDING_ORDERS_PER_USER = 3;

export interface CreateOrderInput {
  userId: string;
  items: Array<{ variantId: string; quantity: number }>;
  address: AddressData;
  shippingOptionId: string;
  couponCode?: string;
  customerDocument: string;
  customerPhone: string;
}

export interface ShippingAddressSnapshot {
  recipient: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  phone: string | null;
}

/**
 * Cria o pedido em UMA transação:
 * 1. recalcula preços a partir do banco;
 * 2. valida frete e cupom (com lock do cupom);
 * 3. reserva estoque de forma atômica;
 * 4. grava pedido, itens, histórico e uso do cupom.
 * Qualquer falha desfaz tudo (nenhuma reserva "órfã").
 */
export async function createOrder(input: CreateOrderInput) {
  const settings = await getStoreSettings();
  const reservationExpiresAt = new Date(Date.now() + settings.pixExpirationMinutes * 60_000);

  // Frete resolvido ANTES da transação (pode envolver API externa). O preço é recalculado
  // no servidor a partir do carrinho; dentro da transação conferimos que o carrinho não mudou.
  const preLines = await quoteCartLines(input.items);
  const preSubtotal = preLines.reduce((a, l) => a + l.lineTotalCents, 0);
  const option = await resolveShippingOption(input.shippingOptionId, {
    zipCode: input.address.zipCode,
    subtotalCents: preSubtotal,
    lines: preLines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPriceCents: l.unitPriceCents, weightGrams: l.weightGrams })),
  });
  if (!option) throw new ValidationError("Opção de frete indisponível para o CEP informado. Recalcule o frete.");

  const order = await db.$transaction(
    async (tx) => {
      const pending = await tx.order.count({ where: { userId: input.userId, status: "PENDING_PAYMENT" } });
      if (pending >= MAX_PENDING_ORDERS_PER_USER) {
        throw new ConflictError("Você já possui pedidos aguardando pagamento. Conclua ou aguarde a expiração deles.", "TOO_MANY_PENDING_ORDERS");
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId }, select: { id: true, name: true, email: true } });

      const lines = await quoteCartLines(input.items, tx);
      if (lines.length === 0) throw new ValidationError("Seu carrinho está vazio.");
      // Produto removido/despublicado → o carrinho mudou.
      if (lines.length !== new Set(input.items.map((i) => i.variantId)).size || lines.some((l) => !l.sellable)) {
        throw new ConflictError("Alguns produtos não estão mais disponíveis. Revise o carrinho.", "CART_CHANGED");
      }
      // Falta de estoque tem SEMPRE o mesmo código, seja detectada aqui (outra compra reservou antes)
      // ou na reserva atômica logo abaixo — o cliente recebe uma resposta consistente.
      const short = lines.find((l) => l.issue !== null);
      if (short) {
        throw new ConflictError(`Estoque insuficiente para "${short.productName} — ${short.variantName}". Atualize o carrinho.`, "OUT_OF_STOCK", { variantId: short.variantId });
      }

      const subtotalCents = lines.reduce((a, l) => a + l.lineTotalCents, 0);
      if (subtotalCents !== preSubtotal) throw new ConflictError("Os valores do carrinho foram atualizados. Revise e tente novamente.", "CART_CHANGED");

      let coupon: Awaited<ReturnType<typeof checkCoupon>>["coupon"] = null;
      if (input.couponCode) {
        const check = await checkCoupon(input.couponCode, { subtotalCents, userId: input.userId, tx, lock: true });
        if (!check.evaluation.ok) throw new ValidationError(check.evaluation.reason);
        coupon = check.coupon;
      }

      const totals = computeTotals({
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
        coupon,
        shippingCents: option.priceCents,
      });
      if (totals.totalCents < 100) throw new ValidationError("O valor mínimo do pedido é R$ 1,00.");

      const shippingAddress: ShippingAddressSnapshot = {
        recipient: input.address.recipient,
        zipCode: input.address.zipCode,
        street: input.address.street,
        number: input.address.number,
        complement: input.address.complement ?? null,
        district: input.address.district,
        city: input.address.city,
        state: input.address.state,
        phone: input.address.phone ?? null,
      };

      const created = await tx.order.create({
        data: {
          userId: user.id,
          status: "PENDING_PAYMENT",
          ...totals,
          couponId: coupon?.id ?? null,
          couponCode: coupon?.code ?? null,
          customerName: user.name,
          customerEmail: user.email,
          customerDocument: input.customerDocument,
          customerPhone: input.customerPhone,
          shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue,
          shippingZoneId: option.zoneId,
          shippingProvider: option.provider,
          shippingServiceId: option.serviceId,
          shippingQuote: option as unknown as Prisma.InputJsonValue,
          shippingCarrier: option.carrier,
          shippingService: option.serviceName,
          shippingMinDays: option.minDays,
          shippingMaxDays: option.maxDays,
          reservationExpiresAt,
          items: {
            create: lines.map((l) => ({
              variantId: l.variantId,
              productId: l.productId,
              productName: l.productName,
              variantName: l.variantName,
              sku: l.sku,
              imageUrl: l.imageUrl,
              unitPriceCents: l.unitPriceCents,
              quantity: l.quantity,
              totalCents: l.lineTotalCents,
            })),
          },
          statusHistory: { create: { toStatus: "PENDING_PAYMENT", note: "Pedido criado", actorId: user.id } },
        },
        select: { id: true, number: true, totalCents: true },
      });

      await reserveStock(
        tx,
        lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, label: `${l.productName} — ${l.variantName}` })),
        created.id,
      );

      if (coupon) {
        await tx.couponRedemption.create({
          data: { couponId: coupon.id, orderId: created.id, userId: user.id, discountCents: totals.discountCents },
        });
      }

      return created;
    },
    { timeout: 15_000, maxWait: 5_000 },
  );

  logger.info("order.created", { orderId: order.id, number: order.number });
  await notifyOrder(order.id, "CREATED");
  return order;
}

async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  return tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
}

const toStockLines = (items: Array<{ variantId: string | null; quantity: number }>): StockLine[] =>
  items.filter((i): i is { variantId: string; quantity: number } => i.variantId !== null).map((i) => ({ variantId: i.variantId, quantity: i.quantity }));

async function recordTransition(tx: Tx, orderId: string, from: OrderStatus, to: OrderStatus, note?: string | null, actorId?: string | null) {
  await tx.orderStatusHistory.create({ data: { orderId, fromStatus: from, toStatus: to, note: note ?? null, actorId: actorId ?? null } });
}

/**
 * Marca o pedido como pago. Chamado SOMENTE pelo serviço de pagamentos depois
 * de confirmar o status diretamente na API do provedor. Idempotente.
 * Deve ser executado dentro da transação que atualiza o pagamento.
 */
export async function markOrderPaid(tx: Tx, orderId: string, note: string): Promise<{ outcome: "PAID" | "ALREADY_PAID" | "NO_STOCK" }> {
  const order = await lockOrder(tx, orderId);
  if (!order) throw new NotFoundError("Pedido não encontrado.");
  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUNDED"].includes(order.status)) return { outcome: "ALREADY_PAID" };

  const lines = toStockLines(order.items);
  if (order.status === "PENDING_PAYMENT") {
    await commitReservedSale(tx, lines, order.id);
  } else {
    // CANCELLED/EXPIRED: a reserva já foi liberada. Tenta vender do disponível
    // (tudo-ou-nada). Sem estoque, o pagamento fica registrado e o pedido exige reembolso.
    const ok = await tryDirectSale(tx, lines, order.id);
    if (!ok) return { outcome: "NO_STOCK" };
  }

  if (!canTransition(order.status, "PAID")) throw new AppError("Transição de pedido inválida.", 409, "INVALID_TRANSITION");
  await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), reservationExpiresAt: null } });
  await recordTransition(tx, order.id, order.status, "PAID", note);
  return { outcome: "PAID" };
}

/** Libera estoque/cupom de um pedido não pago e o marca como EXPIRED ou CANCELLED. */
async function closeUnpaidOrder(tx: Tx, orderId: string, to: "EXPIRED" | "CANCELLED", note: string, actorId?: string | null) {
  const order = await lockOrder(tx, orderId);
  if (!order || order.status !== "PENDING_PAYMENT") return false;
  await releaseReservation(tx, toStockLines(order.items), order.id, note);
  await tx.couponRedemption.deleteMany({ where: { orderId: order.id } });
  await tx.order.update({ where: { id: order.id }, data: { status: to, cancelledAt: new Date(), reservationExpiresAt: null } });
  await tx.payment.updateMany({ where: { orderId: order.id, status: { in: ["PENDING"] } }, data: { status: "EXPIRED" } });
  await recordTransition(tx, order.id, "PENDING_PAYMENT", to, note, actorId);
  return true;
}

export async function expireOrder(orderId: string): Promise<boolean> {
  const expired = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { reservationExpiresAt: true, status: true } });
    if (!order || order.status !== "PENDING_PAYMENT" || !order.reservationExpiresAt || order.reservationExpiresAt > new Date()) return false;
    // Pagamento em análise (ex.: cartão em revisão antifraude) não expira automaticamente.
    const inProcess = await tx.payment.count({ where: { orderId, status: { in: ["IN_PROCESS", "APPROVED"] } } });
    if (inProcess > 0) return false;
    return closeUnpaidOrder(tx, orderId, "EXPIRED", "Prazo de pagamento expirado");
  });
  if (expired) await notifyOrder(orderId, "EXPIRED");
  return expired;
}

/** Pedidos de um cliente que já passaram do prazo (chamado pelo cron e sob demanda). */
export async function findExpiredPendingOrderIds(limit = 100): Promise<string[]> {
  const rows = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", reservationExpiresAt: { lt: new Date() } },
    select: { id: true },
    orderBy: { reservationExpiresAt: "asc" },
    take: limit,
  });
  return rows.map((r) => r.id);
}

// ---- Ações administrativas --------------------------------------------------

/** Atualização manual (equipe) ou automática (actorId null = sistema, ex.: rastreio sincronizado). */
export async function adminUpdateOrderStatus(input: { orderId: string; to: OrderStatus; note: string | null; actorId: string | null; ip: string | null }) {
  await db.$transaction(async (tx) => {
    const order = await lockOrder(tx, input.orderId);
    if (!order) throw new NotFoundError("Pedido não encontrado.");
    if (!canTransitionManually(order.status, input.to)) {
      throw new ConflictError("Esta alteração de status não é permitida para o pedido atual.", "INVALID_TRANSITION");
    }

    if (input.to === "CANCELLED") {
      if (order.status === "PENDING_PAYMENT") {
        await closeUnpaidOrder(tx, order.id, "CANCELLED", input.note ?? "Cancelado pela equipe", input.actorId);
      } else {
        // Pedido pago: cancelar exige reembolso. Bloqueia se ainda houver valor não reembolsado.
        const paid = await tx.payment.findFirst({ where: { orderId: order.id, status: "APPROVED" } });
        if (paid && paid.refundedCents < paid.amountCents) {
          throw new ConflictError("Pedido pago: realize o reembolso antes de cancelar.", "REFUND_REQUIRED");
        }
        await returnToStock(tx, toStockLines(order.items), order.id, "Cancelamento de pedido pago", input.actorId);
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
        await recordTransition(tx, order.id, order.status, "CANCELLED", input.note, input.actorId);
      }
    } else {
      await tx.order.update({ where: { id: order.id }, data: { status: input.to } });
      await recordTransition(tx, order.id, order.status, input.to, input.note, input.actorId);
      if (input.to === "SHIPPED" || input.to === "DELIVERED") {
        await tx.shipment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            carrier: order.shippingCarrier,
            service: order.shippingService,
            status: input.to === "DELIVERED" ? "DELIVERED" : "POSTED",
            shippedAt: new Date(),
            deliveredAt: input.to === "DELIVERED" ? new Date() : null,
          },
          update: input.to === "DELIVERED" ? { status: "DELIVERED", deliveredAt: new Date() } : { shippedAt: new Date() },
        });
      }
    }

    await audit({ actorId: input.actorId, action: "order.status_update", entityType: "Order", entityId: order.id, metadata: { from: order.status, to: input.to }, ip: input.ip }, tx);
  });
  // Após a transação (inclusive quando a mudança vem da sincronização de rastreio).
  if (input.to === "SHIPPED" || input.to === "DELIVERED" || input.to === "CANCELLED") await notifyOrder(input.orderId, input.to);
}

// ---- Leitura para o cliente (sempre filtrando por userId — anti-IDOR) ---------

export async function getCustomerOrder(orderId: string, userId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      shipment: { include: { events: { orderBy: { occurredAt: "desc" } } } },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          method: true,
          status: true,
          statusDetail: true,
          amountCents: true,
          installments: true,
          pixQrCode: true,
          pixQrCodeBase64: true,
          ticketUrl: true,
          boletoLine: true,
          expiresAt: true,
          approvedAt: true,
          cardBrand: true,
          cardLastFour: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) throw new NotFoundError("Pedido não encontrado.");
  return order;
}

export async function expireIfDue(orderId: string): Promise<void> {
  try {
    await expireOrder(orderId);
  } catch (error) {
    logger.warn("order.lazy_expire_failed", { orderId, error });
  }
}
