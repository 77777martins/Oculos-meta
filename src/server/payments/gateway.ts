/**
 * Contrato do provedor de pagamentos. O restante do sistema depende APENAS
 * desta interface — trocar de provedor (ou usar um dublê em testes) não
 * afeta as regras de negócio.
 */
export interface ProviderPayment {
  id: string;
  /** Status bruto do provedor (approved, pending, rejected…). */
  status: string;
  statusDetail: string | null;
  amountCents: number;
  currency: string;
  externalReference: string | null;
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  installments: number;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: Date | null;
  approvedAt: Date | null;
  cardLastFour: string | null;
  refundedCents: number;
}

export interface PayerInfo {
  email: string;
  firstName: string;
  lastName: string;
  documentType: "CPF" | "CNPJ";
  documentNumber: string;
}

export interface CreatePixInput {
  idempotencyKey: string;
  externalReference: string;
  amountCents: number;
  description: string;
  expiresAt: Date;
  payer: PayerInfo;
  notificationUrl: string | null;
}

export interface CreateCardInput {
  idempotencyKey: string;
  externalReference: string;
  amountCents: number;
  description: string;
  token: string;
  paymentMethodId: string;
  issuerId: string | null;
  installments: number;
  payer: PayerInfo;
  notificationUrl: string | null;
}

export interface ProviderRefund {
  id: string;
  status: string;
  amountCents: number;
}

export interface PaymentGateway {
  readonly name: "MERCADO_PAGO";
  isConfigured(): boolean;
  createPixPayment(input: CreatePixInput): Promise<ProviderPayment>;
  createCardPayment(input: CreateCardInput): Promise<ProviderPayment>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  cancelPayment(providerPaymentId: string): Promise<void>;
  refundPayment(input: { providerPaymentId: string; amountCents?: number; idempotencyKey: string }): Promise<ProviderRefund>;
}

/** Erro do provedor com mensagem segura para o cliente. */
export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "PaymentProviderError";
  }
}
