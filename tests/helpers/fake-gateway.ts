import type { CreateBoletoInput, CreateCardInput, CreatePixInput, PaymentGateway, ProviderPayment, ProviderRefund } from "@/server/payments/gateway";

/**
 * Dublê do Mercado Pago para testes: mantém pagamentos em memória e permite
 * alterar o status "no provedor" para simular aprovação, recusa, reembolso.
 * NÃO é usado fora dos testes (setPaymentGatewayForTests exige NODE_ENV=test).
 */
export class FakeGateway implements PaymentGateway {
  readonly name = "MERCADO_PAGO" as const;
  payments = new Map<string, ProviderPayment>();
  idempotency = new Map<string, string>();
  refunds: ProviderRefund[] = [];
  private next = 1000;

  isConfigured() {
    return true;
  }

  private create(key: string, base: Partial<ProviderPayment> & { amountCents: number; externalReference: string }): ProviderPayment {
    const existing = this.idempotency.get(key);
    if (existing) return this.payments.get(existing)!;
    const id = String(this.next++);
    const p: ProviderPayment = {
      id,
      status: "pending",
      statusDetail: "pending_waiting_transfer",
      currency: "BRL",
      paymentMethodId: null,
      paymentTypeId: null,
      installments: 1,
      pixQrCode: null,
      pixQrCodeBase64: null,
      ticketUrl: null,
      boletoLine: null,
      expiresAt: null,
      approvedAt: null,
      cardLastFour: null,
      refundedCents: 0,
      ...base,
    };
    this.payments.set(id, p);
    this.idempotency.set(key, id);
    return p;
  }

  async createPixPayment(input: CreatePixInput) {
    return this.create(input.idempotencyKey, {
      amountCents: input.amountCents,
      externalReference: input.externalReference,
      paymentMethodId: "pix",
      paymentTypeId: "bank_transfer",
      pixQrCode: "00020126580014br.gov.bcb.pix-FAKE",
      pixQrCodeBase64: "iVBORw0KGgo=",
      expiresAt: input.expiresAt,
    });
  }

  boletoInputs: CreateBoletoInput[] = [];

  async createBoletoPayment(input: CreateBoletoInput) {
    this.boletoInputs.push(input);
    return this.create(input.idempotencyKey, {
      amountCents: input.amountCents,
      externalReference: input.externalReference,
      paymentMethodId: "bolbradesco",
      paymentTypeId: "ticket",
      statusDetail: "pending_waiting_payment",
      ticketUrl: "https://www.mercadopago.com.br/payments/0/ticket?fake=1",
      boletoLine: "23790.00000 00000.000000 00000.000000 0 00000000000000",
      expiresAt: input.dueAt,
    });
  }

  /** Token "approve" aprova, "reject" recusa, qualquer outro fica em análise. */
  async createCardPayment(input: CreateCardInput) {
    const status = input.token.startsWith("approve") ? "approved" : input.token.startsWith("reject") ? "rejected" : "in_process";
    return this.create(input.idempotencyKey, {
      amountCents: input.amountCents,
      externalReference: input.externalReference,
      paymentMethodId: input.paymentMethodId,
      paymentTypeId: "credit_card",
      installments: input.installments,
      status,
      statusDetail: status === "approved" ? "accredited" : status === "rejected" ? "cc_rejected_other_reason" : "pending_review_manual",
      approvedAt: status === "approved" ? new Date() : null,
      cardLastFour: "4242",
    });
  }

  async getPayment(id: string) {
    const p = this.payments.get(id);
    if (!p) throw Object.assign(new Error("not found"), { status: 404 });
    return { ...p };
  }

  async cancelPayment(id: string) {
    const p = this.payments.get(id);
    if (p) p.status = "cancelled";
  }

  async refundPayment(input: { providerPaymentId: string; amountCents?: number; idempotencyKey: string }) {
    const p = this.payments.get(input.providerPaymentId)!;
    const amount = input.amountCents ?? p.amountCents - p.refundedCents;
    p.refundedCents += amount;
    if (p.refundedCents >= p.amountCents) p.status = "refunded";
    const r = { id: `R${this.refunds.length + 1}`, status: "approved", amountCents: amount };
    this.refunds.push(r);
    return r;
  }

  /** Simula mudança de status no provedor (ex.: cliente pagou o PIX). */
  setStatus(id: string, status: string, patch: Partial<ProviderPayment> = {}) {
    const p = this.payments.get(id)!;
    Object.assign(p, { status, approvedAt: status === "approved" ? new Date() : p.approvedAt, ...patch });
  }
}
