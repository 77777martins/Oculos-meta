import "server-only";
import { randomUUID } from "node:crypto";
import type { Payment, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, ConflictError, NotFoundError, ServiceUnavailableError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/server/services/audit";
import { returnToStock } from "@/server/services/inventory";
import { markOrderPaid, type ShippingAddressSnapshot } from "@/server/services/orders";
import { canTransition, mapMercadoPagoStatus } from "@/server/services/order-state";
import { getStoreSettings } from "@/server/services/settings";
import { orderPaidEmail, sendMail } from "@/server/services/mail";
import { PaymentProviderError, type PayerInfo, type ProviderPayment } from "./gateway";
import { getPaymentGateway } from "./mercadopago";

/**
 * Regras financeiras:
 * - O valor cobrado é SEMPRE `order.totalCents` lido do banco.
 * - Um pedido só é marcado como pago em `applyProviderPayment`, a partir de
 *   dados obtidos DIRETAMENTE da API do provedor (nunca do navegador e nunca
 *   do corpo do webhook, que serve apenas como "aviso").
 * - Valor e moeda retornados pelo provedor são conferidos com o pedido.
 * - Chaves de idempotência impedem cobranças duplicadas em reenvios.
 */

const FINAL_STATUSES: PaymentStatus[] = ["APPROVED", "REJECTED", "CANCELLED", "REFUNDED", "CHARGED_BACK", "EXPIRED"];

function notificationUrl(): string | null {
  const url = env().APP_URL;
  // O Mercado Pago só aceita URLs públicas https para notificações.
  return url.startsWith("https://") ? `${url}/api/webhooks/mercadopago` : null;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] ?? full, lastName: parts.slice(1).join(" ") || parts[0] || full };
}

function methodFromProvider(p: ProviderPayment, fallback: PaymentMethod): PaymentMethod {
  if (p.paymentMethodId === "pix") return "PIX";
  if (p.paymentTypeId === "credit_card") return "CREDIT_CARD";
  if (p.paymentTypeId === "debit_card") return "DEBIT_CARD";
  if (p.paymentTypeId === "ticket") return "BOLETO";
  return fallback;
}

/** Carrega o pedido do cliente garantindo propriedade (anti-IDOR) e que ainda aceita pagamento. */
async function loadPayableOrder(orderId: string, userId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new NotFoundError("Pedido não encontrado.");
  if (order.status !== "PENDING_PAYMENT") throw new ConflictError("Este pedido não está aguardando pagamento.", "ORDER_NOT_PAYABLE");
  if (order.reservationExpiresAt && order.reservationExpiresAt <= new Date()) {
    throw new ConflictError("O prazo para pagamento deste pedido expirou. Faça um novo pedido.", "ORDER_EXPIRED");
  }
  const blocking = await db.payment.findFirst({ where: { orderId, status: { in: ["APPROVED", "IN_PROCESS"] } } });
  if (blocking) throw new ConflictError("Já existe um pagamento aprovado ou em análise para este pedido.", "PAYMENT_EXISTS");
  return order;
}

function assertGatewayConfigured() {
  if (!getPaymentGateway().isConfigured()) {
    throw new ServiceUnavailableError("Os pagamentos ainda não foram configurados pela loja. Tente novamente mais tarde.");
  }
}

function toAppError(error: unknown): never {
  if (error instanceof PaymentProviderError) {
    throw new AppError(error.message, error.retryable ? 503 : 422, error.retryable ? "PROVIDER_UNAVAILABLE" : "PAYMENT_FAILED");
  }
  throw error;
}

// -----------------------------------------------------------------------------
// PIX
// -----------------------------------------------------------------------------

export async function createPixPayment(orderId: string, userId: string) {
  assertGatewayConfigured();
  const order = await loadPayableOrder(orderId, userId);

  // Reaproveita o PIX pendente ainda válido (evita gerar vários QR Codes para o mesmo pedido).
  const existing = await db.payment.findFirst({
    where: { orderId, method: "PIX", status: "PENDING", amountCents: order.totalCents, expiresAt: { gt: new Date(Date.now() + 60_000) }, pixQrCode: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const settings = await getStoreSettings();
  const expiresAt = new Date(Math.min(order.reservationExpiresAt?.getTime() ?? Infinity, Date.now() + settings.pixExpirationMinutes * 60_000));
  if (expiresAt.getTime() - Date.now() < 5 * 60_000) {
    throw new ConflictError("O prazo deste pedido está quase no fim. Faça um novo pedido para gerar o PIX.", "ORDER_EXPIRING");
  }

  const idempotencyKey = randomUUID();
  const local = await db.payment.create({
    data: { orderId, method: "PIX", status: "PENDING", amountCents: order.totalCents, idempotencyKey, expiresAt },
  });

  const { firstName, lastName } = splitName(order.customerName);
  try {
    const provider = await getPaymentGateway().createPixPayment({
      idempotencyKey,
      externalReference: local.id,
      amountCents: order.totalCents,
      description: `Pedido #${order.number} - ${settings.storeName}`.slice(0, 120),
      expiresAt,
      payer: { email: order.customerEmail, firstName, lastName, documentType: "CPF", documentNumber: order.customerDocument },
      notificationUrl: notificationUrl(),
    });
    if (!provider.pixQrCode) throw new PaymentProviderError("O provedor não retornou o QR Code PIX.", true);

    const updated = await db.payment.update({
      where: { id: local.id },
      data: {
        providerPaymentId: provider.id,
        status: mapMercadoPagoStatus(provider.status),
        statusDetail: provider.statusDetail,
        pixQrCode: provider.pixQrCode,
        pixQrCodeBase64: provider.pixQrCodeBase64,
        ticketUrl: provider.ticketUrl,
        expiresAt: provider.expiresAt ?? expiresAt,
      },
    });
    await recordEvent({ eventKey: `create:${local.id}`, source: "api", type: "payment.created", provider, paymentId: local.id, signatureValid: true });
    return updated;
  } catch (error) {
    await db.payment.update({ where: { id: local.id }, data: { status: "CANCELLED", statusDetail: "provider_error" } }).catch(() => undefined);
    toAppError(error);
  }
}

// -----------------------------------------------------------------------------
// Boleto
// -----------------------------------------------------------------------------

/** Dias extras de reserva após o vencimento: o banco pode levar até ~2 dias úteis para compensar. */
export const BOLETO_COMPENSATION_DAYS = 3;

/** Vencimento às 23:59:59 (Brasília) do N-ésimo dia corrido a partir de hoje. */
export function boletoDueDate(days: number, now = new Date()): Date {
  const brt = new Date(now.getTime() - 3 * 3_600_000); // relógio de Brasília (UTC-3, sem horário de verão)
  return new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() + days, 23 + 3, 59, 59));
}

export async function createBoletoPayment(orderId: string, userId: string) {
  assertGatewayConfigured();
  const settings = await getStoreSettings();
  if (!settings.boletoEnabled) throw new ConflictError("Pagamento por boleto indisponível no momento.", "BOLETO_DISABLED");
  const order = await loadPayableOrder(orderId, userId);

  const existing = await db.payment.findFirst({
    where: { orderId, method: "BOLETO", status: "PENDING", amountCents: order.totalCents, expiresAt: { gt: new Date(Date.now() + 3_600_000) }, ticketUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const dueAt = boletoDueDate(settings.boletoDueDays);
  const address = order.shippingAddress as unknown as ShippingAddressSnapshot;
  const idempotencyKey = randomUUID();
  const local = await db.payment.create({ data: { orderId, method: "BOLETO", status: "PENDING", amountCents: order.totalCents, idempotencyKey, expiresAt: dueAt } });

  const { firstName, lastName } = splitName(order.customerName);
  try {
    const provider = await getPaymentGateway().createBoletoPayment({
      idempotencyKey,
      externalReference: local.id,
      amountCents: order.totalCents,
      description: `Pedido #${order.number} - ${settings.storeName}`.slice(0, 120),
      dueAt,
      payer: {
        email: order.customerEmail,
        firstName,
        lastName,
        documentType: "CPF",
        documentNumber: order.customerDocument,
        address: { zipCode: address.zipCode, street: address.street, number: address.number, district: address.district, city: address.city, state: address.state },
      },
      notificationUrl: notificationUrl(),
    });
    if (!provider.ticketUrl) throw new PaymentProviderError("O provedor não retornou o boleto.", true);

    // Somente após o boleto existir: estende a reserva até o vencimento + prazo de compensação.
    const reservationUntil = new Date(dueAt.getTime() + BOLETO_COMPENSATION_DAYS * 86_400_000);
    const [updated] = await db.$transaction([
      db.payment.update({
        where: { id: local.id },
        data: {
          providerPaymentId: provider.id,
          status: mapMercadoPagoStatus(provider.status),
          statusDetail: provider.statusDetail,
          ticketUrl: provider.ticketUrl,
          boletoLine: provider.boletoLine,
          expiresAt: provider.expiresAt ?? dueAt,
        },
      }),
      db.order.updateMany({
        where: { id: orderId, status: "PENDING_PAYMENT", OR: [{ reservationExpiresAt: null }, { reservationExpiresAt: { lt: reservationUntil } }] },
        data: { reservationExpiresAt: reservationUntil },
      }),
    ]);
    await recordEvent({ eventKey: `create:${local.id}`, source: "api", type: "payment.created", provider, paymentId: local.id, signatureValid: true });
    return updated;
  } catch (error) {
    await db.payment.update({ where: { id: local.id }, data: { status: "CANCELLED", statusDetail: "provider_error" } }).catch(() => undefined);
    toAppError(error);
  }
}

// -----------------------------------------------------------------------------
// Cartão (dados já tokenizados pelo Card Payment Brick — o servidor nunca vê o número do cartão)
// -----------------------------------------------------------------------------

export interface CardPaymentRequest {
  attemptId: string;
  token: string;
  paymentMethodId: string;
  issuerId?: string | number | null;
  installments: number;
  payerEmail: string;
  identificationType?: "CPF" | "CNPJ";
  identificationNumber?: string;
}

export async function createCardPayment(orderId: string, userId: string, req: CardPaymentRequest) {
  assertGatewayConfigured();

  // Idempotência: mesma tentativa (duplo clique / reenvio) devolve o mesmo resultado.
  const previous = await db.payment.findUnique({ where: { idempotencyKey: req.attemptId } });
  if (previous) {
    if (previous.orderId !== orderId) throw new ConflictError("Tentativa de pagamento inválida.", "IDEMPOTENCY_MISMATCH");
    return previous;
  }

  const order = await loadPayableOrder(orderId, userId);
  const settings = await getStoreSettings();
  if (req.installments > settings.maxInstallments) throw new ValidationError(`Parcelamento máximo: ${settings.maxInstallments}x.`);

  const local = await db.payment.create({
    data: { orderId, method: "CREDIT_CARD", status: "PENDING", amountCents: order.totalCents, installments: req.installments, idempotencyKey: req.attemptId },
  });

  const { firstName, lastName } = splitName(order.customerName);
  const payer: PayerInfo = {
    email: req.payerEmail,
    firstName,
    lastName,
    documentType: req.identificationType ?? "CPF",
    documentNumber: req.identificationNumber ?? order.customerDocument,
  };

  let provider: ProviderPayment;
  try {
    provider = await getPaymentGateway().createCardPayment({
      idempotencyKey: req.attemptId,
      externalReference: local.id,
      amountCents: order.totalCents,
      description: `Pedido #${order.number} - ${settings.storeName}`.slice(0, 120),
      token: req.token,
      paymentMethodId: req.paymentMethodId,
      issuerId: req.issuerId != null ? String(req.issuerId) : null,
      installments: req.installments,
      payer,
      notificationUrl: notificationUrl(),
    });
  } catch (error) {
    await db.payment.update({ where: { id: local.id }, data: { status: "REJECTED", statusDetail: "provider_error" } }).catch(() => undefined);
    toAppError(error);
  }

  await db.payment.update({ where: { id: local.id }, data: { providerPaymentId: provider.id, cardLastFour: provider.cardLastFour, cardBrand: provider.paymentMethodId } });
  // A resposta da criação vem diretamente da API do provedor (canal servidor-servidor autenticado).
  return applyProviderPayment(provider, { source: "api", eventKey: `create:${local.id}`, signatureValid: true });
}

// -----------------------------------------------------------------------------
// Aplicação do status do provedor (núcleo idempotente)
// -----------------------------------------------------------------------------

async function recordEvent(e: {
  eventKey: string;
  source: string;
  type: string;
  action?: string | null;
  provider?: ProviderPayment | null;
  providerPaymentId?: string | null;
  paymentId?: string | null;
  signatureValid: boolean;
  error?: string | null;
  processed?: boolean;
  tx?: Tx;
}) {
  const client = e.tx ?? db;
  const payload: Prisma.InputJsonValue | undefined = e.provider
    ? {
        status: e.provider.status,
        statusDetail: e.provider.statusDetail,
        amountCents: e.provider.amountCents,
        currency: e.provider.currency,
        paymentMethodId: e.provider.paymentMethodId,
        installments: e.provider.installments,
        refundedCents: e.provider.refundedCents,
      }
    : undefined;
  await client.paymentEvent.upsert({
    where: { provider_eventKey: { provider: "MERCADO_PAGO", eventKey: e.eventKey.slice(0, 128) } },
    create: {
      eventKey: e.eventKey.slice(0, 128),
      source: e.source,
      type: e.type,
      action: e.action ?? null,
      providerPaymentId: e.provider?.id ?? e.providerPaymentId ?? null,
      paymentId: e.paymentId ?? null,
      statusReported: e.provider?.status ?? null,
      signatureValid: e.signatureValid,
      processedAt: e.processed === false ? null : new Date(),
      error: e.error?.slice(0, 500) ?? null,
      payload,
    },
    update: { processedAt: e.processed === false ? undefined : new Date(), error: e.error?.slice(0, 500) ?? null, paymentId: e.paymentId ?? undefined },
  });
}

/** Evita regressões de status (ex.: notificação antiga "pending" chegando depois de "approved"). */
function shouldUpdateStatus(current: PaymentStatus, next: PaymentStatus): boolean {
  if (current === next) return false;
  if (current === "APPROVED") return next === "REFUNDED" || next === "CHARGED_BACK";
  if (current === "REFUNDED" || current === "CHARGED_BACK") return false;
  if (FINAL_STATUSES.includes(current) && current !== "EXPIRED") return next === "APPROVED"; // rejeitado→aprovado não ocorre, mas aprovado é soberano
  return true;
}

export async function applyProviderPayment(
  provider: ProviderPayment,
  meta: { source: "api" | "webhook" | "poll" | "reconcile"; eventKey: string; signatureValid: boolean; action?: string | null },
): Promise<Payment> {
  let found = await db.payment.findUnique({ where: { providerPaymentId: provider.id }, select: { id: true, providerPaymentId: true } });
  if (!found && provider.externalReference && /^[a-z0-9]{20,32}$/i.test(provider.externalReference)) {
    found = await db.payment.findUnique({ where: { id: provider.externalReference }, select: { id: true, providerPaymentId: true } });
    // Referência aponta para outro pagamento já vinculado a outro ID do provedor: não confia.
    if (found?.providerPaymentId && found.providerPaymentId !== provider.id) found = null;
  }
  if (!found) {
    await recordEvent({ ...meta, type: "payment.unknown", provider, error: "Pagamento não encontrado localmente" });
    throw new NotFoundError("Pagamento não encontrado.");
  }
  const paymentId = found.id;
  let becamePaid = false;

  const result = await db.$transaction(
    async (tx) => {
      // Trava a linha do pagamento: notificações simultâneas são processadas em série.
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${paymentId} FOR UPDATE`;
      let payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });

      const nextStatus = mapMercadoPagoStatus(provider.status);

      // Conferência de integridade financeira.
      if (provider.currency !== "BRL" || provider.amountCents !== payment.amountCents || payment.amountCents !== order.totalCents) {
        logger.error("payment.amount_mismatch", { paymentId: payment.id, expected: payment.amountCents, received: provider.amountCents, currency: provider.currency });
        await recordEvent({ ...meta, type: "payment.amount_mismatch", provider, paymentId: payment.id, error: "Valor/moeda divergente do pedido", tx });
        await audit({ action: "payment.amount_mismatch", entityType: "Payment", entityId: payment.id, metadata: { expected: payment.amountCents, received: provider.amountCents } }, tx);
        await tx.payment.update({ where: { id: payment.id }, data: { providerPaymentId: provider.id, statusDetail: "amount_mismatch" } });
        return { payment: await tx.payment.findUniqueOrThrow({ where: { id: payment.id } }), alert: true };
      }

      const statusChanged = shouldUpdateStatus(payment.status, nextStatus);
      payment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: provider.id,
          statusDetail: provider.statusDetail,
          method: methodFromProvider(provider, payment.method),
          installments: provider.installments || payment.installments,
          refundedCents: Math.min(provider.refundedCents, payment.amountCents),
          cardLastFour: provider.cardLastFour ?? payment.cardLastFour,
          ...(statusChanged ? { status: nextStatus } : {}),
          ...(statusChanged && nextStatus === "APPROVED" ? { approvedAt: provider.approvedAt ?? new Date() } : {}),
        },
      });

      if (statusChanged && nextStatus === "APPROVED") {
        const { outcome } = await markOrderPaid(tx, order.id, `Pagamento ${payment.method} aprovado (${provider.id})`);
        becamePaid = outcome === "PAID";
        if (outcome === "ALREADY_PAID") {
          // Cliente pagou duas vezes (ex.: PIX e depois o boleto). O valor excedente precisa ser devolvido.
          const others = await tx.payment.count({ where: { orderId: order.id, status: "APPROVED", id: { not: payment.id } } });
          if (others > 0) {
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, fromStatus: order.status, toStatus: order.status, note: `ATENÇÃO: pagamento em duplicidade aprovado (${provider.id}) — reembolsar este pagamento.` },
            });
            await audit({ action: "payment.duplicate_approved", entityType: "Payment", entityId: payment.id, metadata: { orderId: order.id } }, tx);
            logger.error("payment.duplicate_approved", { orderId: order.id, paymentId: payment.id });
          }
        }
        if (outcome === "NO_STOCK") {
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, fromStatus: order.status, toStatus: order.status, note: "ATENÇÃO: pagamento aprovado após expiração e sem estoque disponível — reembolso necessário." },
          });
          await audit({ action: "payment.approved_without_stock", entityType: "Order", entityId: order.id, metadata: { paymentId: payment.id } }, tx);
          logger.error("payment.approved_without_stock", { orderId: order.id, paymentId: payment.id });
        }
      }

      if (statusChanged && (nextStatus === "REFUNDED" || nextStatus === "CHARGED_BACK")) {
        await applyFullRefundToOrder(tx, order.id, nextStatus === "CHARGED_BACK" ? "Chargeback registrado pelo provedor" : "Pagamento reembolsado");
      }

      await recordEvent({ ...meta, type: "payment.status", provider, paymentId: payment.id, tx });
      return { payment, alert: false };
    },
    { timeout: 15_000, maxWait: 5_000 },
  );

  logger.info("payment.applied", { paymentId: result.payment.id, status: result.payment.status, source: meta.source });
  if (becamePaid) {
    await cancelOtherPendingPayments(result.payment.orderId, result.payment.id);
    void notifyOrderPaid(result.payment.orderId);
  }
  return result.payment;
}

/**
 * Após a aprovação, cancela no provedor os demais pagamentos ainda pendentes do
 * mesmo pedido (ex.: um boleto emitido antes de o cliente pagar via PIX),
 * evitando cobrança em duplicidade. Falhas são registradas e não desfazem nada.
 */
async function cancelOtherPendingPayments(orderId: string, approvedPaymentId: string): Promise<void> {
  const pending = await db.payment.findMany({
    where: { orderId, id: { not: approvedPaymentId }, status: { in: ["PENDING", "IN_PROCESS"] }, providerPaymentId: { not: null } },
    select: { id: true, providerPaymentId: true },
  });
  for (const p of pending) {
    try {
      await getPaymentGateway().cancelPayment(p.providerPaymentId!);
      await db.payment.updateMany({ where: { id: p.id, status: { in: ["PENDING", "IN_PROCESS"] } }, data: { status: "CANCELLED", statusDetail: "cancelled_other_payment_approved" } });
    } catch (error) {
      logger.warn("payment.cancel_other_failed", { orderId, paymentId: p.id, error });
    }
  }
}

/** E-mail de confirmação — fora da transação: falha de e-mail nunca desfaz o pagamento. */
async function notifyOrderPaid(orderId: string): Promise<void> {
  try {
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { id: true, number: true, customerName: true, customerEmail: true } });
    await sendMail({ to: order.customerEmail, ...orderPaidEmail(order.customerName, order.number, `${env().APP_URL}/conta/pedidos/${order.id}`) });
  } catch (error) {
    logger.error("payment.notify_failed", { orderId, error });
  }
}

/** Reembolso total: pedido vira REFUNDED e, se ainda não enviado, o estoque retorna. */
async function applyFullRefundToOrder(tx: Tx, orderId: string, note: string, actorId?: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!canTransition(order.status, "REFUNDED")) return;
  if (order.status === "PAID" || order.status === "PROCESSING") {
    const lines = order.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));
    await returnToStock(tx, lines, order.id, "Reembolso antes do envio", actorId);
  }
  await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
  await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: "REFUNDED", note, actorId: actorId ?? null } });
}

/** Busca o status atual na API do provedor e aplica (webhook, polling, conciliação). */
export async function syncProviderPayment(providerPaymentId: string, meta: { source: "webhook" | "poll" | "reconcile"; eventKey: string; signatureValid: boolean; action?: string | null }) {
  if (!/^\d{1,20}$/.test(providerPaymentId)) throw new ValidationError("ID de pagamento inválido.");
  const provider = await getPaymentGateway().getPayment(providerPaymentId);
  return applyProviderPayment(provider, meta);
}

/**
 * "Consulta de status" usada pela página de pagamento (polling).
 * Consulta o provedor somente para pagamentos não finalizados do próprio cliente.
 */
export async function refreshOrderPaymentStatus(orderId: string, userId: string, opts: { queryProvider: boolean } = { queryProvider: true }) {
  const order = await db.order.findFirst({ where: { id: orderId, userId }, select: { id: true, status: true } });
  if (!order) throw new NotFoundError("Pedido não encontrado.");

  const pending = await db.payment.findFirst({
    where: { orderId, status: { in: ["PENDING", "IN_PROCESS"] }, providerPaymentId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (opts.queryProvider && pending?.providerPaymentId && getPaymentGateway().isConfigured()) {
    try {
      await syncProviderPayment(pending.providerPaymentId, { source: "poll", eventKey: `poll:${pending.id}:${Math.floor(Date.now() / 15_000)}`, signatureValid: true });
    } catch (error) {
      logger.warn("payment.poll_failed", { orderId, error });
    }
  }

  const fresh = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { status: true, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, statusDetail: true, method: true } } },
  });
  return { orderStatus: fresh.status, payment: fresh.payments[0] ?? null };
}

// -----------------------------------------------------------------------------
// Reembolso (painel administrativo)
// -----------------------------------------------------------------------------

export async function refundPayment(input: { paymentId: string; amountCents?: number; reason: string; actorId: string; ip: string }) {
  const payment = await db.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment || !payment.providerPaymentId) throw new NotFoundError("Pagamento não encontrado.");
  if (payment.status !== "APPROVED") throw new ConflictError("Somente pagamentos aprovados podem ser reembolsados.", "NOT_REFUNDABLE");

  const remaining = payment.amountCents - payment.refundedCents;
  const amount = input.amountCents ?? remaining;
  if (amount <= 0 || amount > remaining) throw new ValidationError(`Valor máximo para reembolso: ${(remaining / 100).toFixed(2)}.`);
  const isTotal = amount === remaining && payment.refundedCents === 0;

  const refundRow = await db.refund.create({
    data: { paymentId: payment.id, amountCents: amount, status: "PENDING", reason: input.reason, actorId: input.actorId },
  });

  let providerRefund;
  try {
    providerRefund = await getPaymentGateway().refundPayment({
      providerPaymentId: payment.providerPaymentId,
      amountCents: isTotal ? undefined : amount,
      idempotencyKey: refundRow.id,
    });
  } catch (error) {
    await db.refund.update({ where: { id: refundRow.id }, data: { status: "REJECTED" } });
    toAppError(error);
  }

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${payment.id} FOR UPDATE`;
    const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const approved = providerRefund.status === "approved";
    await tx.refund.update({ where: { id: refundRow.id }, data: { providerRefundId: providerRefund.id, status: approved ? "APPROVED" : "PENDING" } });
    if (approved) {
      const refundedCents = Math.min(current.amountCents, current.refundedCents + amount);
      const full = refundedCents >= current.amountCents;
      await tx.payment.update({ where: { id: current.id }, data: { refundedCents, ...(full ? { status: "REFUNDED" } : {}) } });
      if (full) {
        await applyFullRefundToOrder(tx, current.orderId, `Reembolso total: ${input.reason}`, input.actorId);
      } else {
        const order = await tx.order.findUniqueOrThrow({ where: { id: current.orderId }, select: { status: true } });
        await tx.orderStatusHistory.create({
          data: { orderId: current.orderId, fromStatus: order.status, toStatus: order.status, note: `Reembolso parcial de R$ ${(amount / 100).toFixed(2)}: ${input.reason}`, actorId: input.actorId },
        });
      }
    }
    await audit({ actorId: input.actorId, action: "payment.refund", entityType: "Payment", entityId: payment.id, metadata: { amountCents: amount, status: providerRefund.status }, ip: input.ip }, tx);
  });

  return { refundId: refundRow.id, status: providerRefund.status };
}

export { recordEvent as recordPaymentEvent };
