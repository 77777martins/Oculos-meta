import "server-only";
import { MercadoPagoConfig, Payment, PaymentRefund } from "mercadopago";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { centsToDecimal, decimalToCents } from "@/lib/money";
import {
  PaymentProviderError,
  type CreateBoletoInput,
  type CreateCardInput,
  type CreatePixInput,
  type PayerInfo,
  type PaymentGateway,
  type ProviderPayment,
  type ProviderRefund,
} from "./gateway";

type MpPayment = Awaited<ReturnType<Payment["get"]>>;

/** Formato aceito pelo Mercado Pago: 2026-01-31T23:59:59.000-03:00 (horário de Brasília). */
export { safeHttpsUrl };

export function toMercadoPagoDate(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().replace("Z", "-03:00");
}

/** Aceita apenas URLs https (o link é renderizado como href para o cliente). */
function safeHttpsUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function mapPayment(p: MpPayment): ProviderPayment {
  if (p.id === undefined || p.id === null) throw new PaymentProviderError("Resposta do provedor sem ID de pagamento.", false);
  const tx = p.point_of_interaction?.transaction_data;
  return {
    id: String(p.id),
    status: p.status ?? "pending",
    statusDetail: p.status_detail ?? null,
    amountCents: decimalToCents(p.transaction_amount ?? 0),
    currency: p.currency_id ?? "BRL",
    externalReference: p.external_reference ?? null,
    paymentMethodId: p.payment_method_id ?? null,
    paymentTypeId: p.payment_type_id ?? null,
    installments: p.installments ?? 1,
    pixQrCode: tx?.qr_code ?? null,
    pixQrCodeBase64: tx?.qr_code_base64 ?? null,
    // PIX: ticket_url · Boleto: transaction_details.external_resource_url
    ticketUrl: safeHttpsUrl(tx?.ticket_url ?? p.transaction_details?.external_resource_url),
    boletoLine: (p.transaction_details?.digitable_line ?? p.transaction_details?.barcode?.content ?? null)?.slice(0, 80) ?? null,
    expiresAt: p.date_of_expiration ? new Date(p.date_of_expiration) : null,
    approvedAt: p.date_approved ? new Date(p.date_approved) : null,
    cardLastFour: p.card?.last_four_digits ?? null,
    refundedCents: decimalToCents(p.transaction_amount_refunded ?? 0),
  };
}

function payer(info: PayerInfo) {
  return {
    email: info.email,
    first_name: info.firstName,
    last_name: info.lastName,
    identification: { type: info.documentType, number: info.documentNumber },
  };
}

/** Converte erros do SDK em erro de domínio sem vazar detalhes internos. */
function wrap(error: unknown, operation: string): never {
  const e = error as { status?: number; message?: string; name?: string };
  const status = typeof e?.status === "number" ? e.status : undefined;
  logger.error("mercadopago.error", { operation, status, name: e?.name, message: e?.message });
  const retryable = status === undefined || status >= 500 || status === 429;
  throw new PaymentProviderError(
    retryable ? "O provedor de pagamento está indisponível no momento. Tente novamente." : "Não foi possível processar o pagamento. Verifique os dados e tente novamente.",
    retryable,
    { cause: error },
  );
}

export class MercadoPagoGateway implements PaymentGateway {
  readonly name = "MERCADO_PAGO" as const;

  private client(idempotencyKey?: string) {
    const accessToken = env().MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new PaymentProviderError("Pagamentos não configurados. Contate a loja.", false);
    return new MercadoPagoConfig({ accessToken, options: { timeout: 15_000, ...(idempotencyKey ? { idempotencyKey } : {}) } });
  }

  isConfigured(): boolean {
    return Boolean(env().MERCADOPAGO_ACCESS_TOKEN);
  }

  async createPixPayment(input: CreatePixInput): Promise<ProviderPayment> {
    try {
      const res = await new Payment(this.client()).create({
        body: {
          transaction_amount: centsToDecimal(input.amountCents),
          description: input.description,
          payment_method_id: "pix",
          external_reference: input.externalReference,
          date_of_expiration: toMercadoPagoDate(input.expiresAt),
          payer: payer(input.payer),
          ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
        },
        requestOptions: { idempotencyKey: input.idempotencyKey },
      });
      return mapPayment(res);
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      wrap(error, "create_pix");
    }
  }

  async createCardPayment(input: CreateCardInput): Promise<ProviderPayment> {
    try {
      const res = await new Payment(this.client()).create({
        body: {
          transaction_amount: centsToDecimal(input.amountCents),
          description: input.description,
          token: input.token,
          payment_method_id: input.paymentMethodId,
          ...(input.issuerId ? { issuer_id: Number(input.issuerId) } : {}),
          installments: input.installments,
          external_reference: input.externalReference,
          statement_descriptor: env().MERCADOPAGO_STATEMENT_DESCRIPTOR,
          payer: payer(input.payer),
          ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
        },
        requestOptions: { idempotencyKey: input.idempotencyKey },
      });
      return mapPayment(res);
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      wrap(error, "create_card");
    }
  }

  async createBoletoPayment(input: CreateBoletoInput): Promise<ProviderPayment> {
    try {
      const a = input.payer.address;
      const res = await new Payment(this.client()).create({
        body: {
          transaction_amount: centsToDecimal(input.amountCents),
          description: input.description,
          payment_method_id: "bolbradesco",
          external_reference: input.externalReference,
          date_of_expiration: toMercadoPagoDate(input.dueAt),
          payer: {
            ...payer(input.payer),
            address: { zip_code: a.zipCode, street_name: a.street, street_number: a.number, neighborhood: a.district, city: a.city, federal_unit: a.state },
          },
          ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
        },
        requestOptions: { idempotencyKey: input.idempotencyKey },
      });
      return mapPayment(res);
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      wrap(error, "create_boleto");
    }
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    try {
      return mapPayment(await new Payment(this.client()).get({ id: providerPaymentId }));
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      wrap(error, "get_payment");
    }
  }

  async cancelPayment(providerPaymentId: string): Promise<void> {
    try {
      await new Payment(this.client()).cancel({ id: providerPaymentId });
    } catch (error) {
      wrap(error, "cancel_payment");
    }
  }

  async refundPayment(input: { providerPaymentId: string; amountCents?: number; idempotencyKey: string }): Promise<ProviderRefund> {
    try {
      const client = new PaymentRefund(this.client());
      const requestOptions = { idempotencyKey: input.idempotencyKey };
      const res =
        input.amountCents === undefined
          ? await client.total({ payment_id: input.providerPaymentId, requestOptions })
          : await client.create({ payment_id: input.providerPaymentId, body: { amount: centsToDecimal(input.amountCents) }, requestOptions });
      return { id: String(res.id), status: res.status ?? "pending", amountCents: decimalToCents(res.amount ?? 0) };
    } catch (error) {
      wrap(error, "refund");
    }
  }
}

let gateway: PaymentGateway | undefined;

export function getPaymentGateway(): PaymentGateway {
  gateway ??= new MercadoPagoGateway();
  return gateway;
}

/** Somente para testes automatizados (injeção de dublê do provedor). */
export function setPaymentGatewayForTests(g: PaymentGateway | undefined): void {
  if (process.env.NODE_ENV !== "test") throw new Error("setPaymentGatewayForTests só pode ser usado em testes.");
  gateway = g;
}
