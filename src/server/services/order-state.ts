/**
 * Máquina de estados do pedido (PURA).
 * Centraliza quais transições são válidas — evita pedidos "pulando" etapas
 * (ex.: marcar como enviado um pedido não pago).
 */
import type { OrderStatus, PaymentStatus } from "@prisma/client";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED", "EXPIRED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: ["PAID", "REFUNDED"], // PAID: pagamento aprovado tardiamente com estoque disponível
  EXPIRED: ["PAID", "REFUNDED"],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Transições que a equipe pode aplicar manualmente pelo painel. */
export const MANUAL_TRANSITIONS: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

export function canTransitionManually(from: OrderStatus, to: OrderStatus): boolean {
  return MANUAL_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Mapeia o status do Mercado Pago para o status interno. */
export function mapMercadoPagoStatus(status: string | undefined | null): PaymentStatus {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "authorized":
    case "in_process":
    case "in_mediation":
      return "IN_PROCESS";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "charged_back":
      return "CHARGED_BACK";
    case "pending":
    default:
      return "PENDING";
  }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento aprovado",
  PROCESSING: "Em separação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  IN_PROCESS: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGED_BACK: "Estornado (chargeback)",
  EXPIRED: "Expirado",
};

export const SHIPMENT_STATUS_LABELS = {
  PENDING: "Aguardando envio",
  POSTED: "Postado",
  IN_TRANSIT: "Em trânsito",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  RETURNED: "Devolvido",
  FAILED: "Falha na entrega",
} as const;
