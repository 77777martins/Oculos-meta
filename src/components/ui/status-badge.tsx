import type { OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, SHIPMENT_STATUS_LABELS } from "@/server/services/order-state";
import { Badge, type Tone } from "./badge";

const orderTone: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  PROCESSING: "brand",
  SHIPPED: "brand",
  DELIVERED: "success",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  REFUNDED: "danger",
};

const paymentTone: Record<PaymentStatus, Tone> = {
  PENDING: "warning",
  IN_PROCESS: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  REFUNDED: "danger",
  CHARGED_BACK: "danger",
  EXPIRED: "neutral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTone[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTone[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return <Badge tone={status === "DELIVERED" ? "success" : status === "FAILED" || status === "RETURNED" ? "danger" : "brand"}>{SHIPMENT_STATUS_LABELS[status]}</Badge>;
}
