import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermissionPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { formatCpf, formatDateTime, formatZip } from "@/lib/utils";
import { idSchema } from "@/lib/validation/common";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { OrderStatusForm, PaymentActions, ShipmentEventForm, ShipmentForm, SyncTrackingButton } from "@/components/admin/order-actions";
import { OrderStatusBadge, PaymentStatusBadge, ShipmentStatusBadge } from "@/components/ui/status-badge";
import { ORDER_STATUS_LABELS } from "@/server/services/order-state";
import type { ShippingAddressSnapshot } from "@/server/services/orders";

export const metadata = { title: "Pedido" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionPage("orders:read");
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      shipment: { include: { events: { orderBy: { occurredAt: "desc" } } } },
      payments: { orderBy: { createdAt: "desc" }, include: { refunds: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" }, take: 10 } } },
    },
  });
  if (!order) notFound();
  const a = order.shippingAddress as unknown as ShippingAddressSnapshot;
  const canUpdate = hasPermission(user.role, "orders:update");
  const isPaid = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);

  return (
    <>
      <Link href="/admin/pedidos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Pedidos
      </Link>
      <AdminHeader title={`Pedido #${order.number}`} description={`Criado em ${formatDateTime(order.createdAt)}`} actions={<OrderStatusBadge status={order.status} />} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Itens">
            <ul className="divide-y divide-slate-100 text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3">
                  <span>
                    <span className="font-medium">{i.productName}</span> — {i.variantName}
                    <span className="block font-mono text-xs text-slate-500">{i.sku}</span>
                  </span>
                  <span className="text-right tabular-nums">
                    {i.quantity}× {formatBRL(i.unitPriceCents)}
                    <span className="block font-semibold">{formatBRL(i.totalCents)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
              {order.shippingProvider === "MELHOR_ENVIO" && <p className="pb-1 text-xs text-brand-700">Frete cotado via Melhor Envio (serviço {order.shippingServiceId}) — compre a etiqueta com este serviço.</p>}
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(order.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>Desconto {order.couponCode && `(${order.couponCode})`}</dt><dd>− {formatBRL(order.discountCents)}</dd></div>
              <div className="flex justify-between"><dt>Frete ({order.shippingCarrier} {order.shippingService})</dt><dd>{formatBRL(order.shippingCents)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatBRL(order.totalCents)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Pagamentos">
            {order.payments.length === 0 && <p className="text-sm text-slate-500">Nenhuma tentativa de pagamento.</p>}
            <ul className="space-y-4">
              {order.payments.map((p) => (
                <li key={p.id} className="rounded-xl border border-slate-100 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {p.method} · {formatBRL(p.amountCents)}
                      {p.installments > 1 && ` · ${p.installments}x`}
                      {p.cardLastFour && ` · final ${p.cardLastFour}`}
                    </span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    MP #{p.providerPaymentId ?? "—"} · {p.statusDetail ?? "sem detalhe"} · criado {formatDateTime(p.createdAt)}
                    {p.approvedAt && ` · aprovado ${formatDateTime(p.approvedAt)}`}
                    {p.refundedCents > 0 && ` · reembolsado ${formatBRL(p.refundedCents)}`}
                  </p>
                  {p.refunds.length > 0 && (
                    <ul className="mt-2 text-xs text-slate-600">
                      {p.refunds.map((r) => (
                        <li key={r.id}>
                          Reembolso {formatBRL(r.amountCents)} — {r.status} — {r.reason} ({formatDateTime(r.createdAt)})
                        </li>
                      ))}
                    </ul>
                  )}
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-slate-500">Eventos ({p.events.length})</summary>
                    <ul className="mt-1 space-y-0.5 text-slate-600">
                      {p.events.map((e) => (
                        <li key={e.id}>
                          {formatDateTime(e.createdAt)} · {e.source} · {e.type} · {e.statusReported ?? "—"} {e.error && <span className="text-red-600">· {e.error}</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                  <PaymentActions
                    paymentId={p.id}
                    remainingCents={p.status === "APPROVED" ? p.amountCents - p.refundedCents : 0}
                    canRefund={hasPermission(user.role, "payments:refund")}
                    canSync={hasPermission(user.role, "payments:read") && Boolean(p.providerPaymentId)}
                  />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Entrega e rastreamento">
            {order.shipment && (
              <p className="mb-4 flex items-center gap-2 text-sm">
                Código <span className="font-mono font-semibold">{order.shipment.trackingCode ?? "—"}</span> <ShipmentStatusBadge status={order.shipment.status} />
              </p>
            )}
            {order.shipment?.trackingCode && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3 text-xs text-slate-600">
                <span>
                  Melhor Envio:{" "}
                  {order.shipment.providerOrderId
                    ? `vinculado · status "${order.shipment.providerStatus ?? "—"}"${order.shipment.lastSyncedAt ? ` · sincronizado ${formatDateTime(order.shipment.lastSyncedAt)}` : ""}`
                    : "etiqueta ainda não localizada (sincronização automática a cada ~20 min)"}
                </span>
                {canUpdate && <SyncTrackingButton orderId={order.id} />}
              </div>
            )}
            {canUpdate && isPaid ? (
              <div className="space-y-6">
                <ShipmentForm orderId={order.id} initial={order.shipment} />
                {order.shipment?.trackingCode && (
                  <div className="border-t border-slate-100 pt-6">
                    <p className="mb-3 text-sm font-semibold">Registrar movimentação</p>
                    <ShipmentEventForm orderId={order.id} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Rastreio disponível após a confirmação do pagamento.</p>
            )}
            {order.shipment && order.shipment.events.length > 0 && (
              <ol className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
                {order.shipment.events.map((e) => (
                  <li key={e.id}>
                    <span className="font-medium">{e.description}</span>
                    <span className="block text-xs text-slate-500">
                      {formatDateTime(e.occurredAt)} {e.location && `· ${e.location}`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Alterar status">
            <OrderStatusForm orderId={order.id} status={order.status} canUpdate={canUpdate} />
          </Panel>
          <Panel title="Cliente">
            <dl className="space-y-1 text-sm">
              <dt className="sr-only">Nome</dt>
              <dd className="font-medium">{order.customerName}</dd>
              <dd className="text-slate-600">{order.customerEmail}</dd>
              <dd className="text-slate-600">{order.customerPhone}</dd>
              <dd className="text-slate-600">CPF {formatCpf(order.customerDocument)}</dd>
            </dl>
            <Link href={`/admin/clientes/${order.userId}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
              Ver cliente
            </Link>
          </Panel>
          <Panel title="Endereço de entrega">
            <p className="text-sm text-slate-700">
              {a.recipient}
              <br />
              {a.street}, {a.number} {a.complement}
              <br />
              {a.district} · {a.city}/{a.state}
              <br />
              CEP {formatZip(a.zipCode)}
            </p>
          </Panel>
          <Panel title="Histórico">
            <ul className="space-y-2 text-sm">
              {order.statusHistory.map((h) => (
                <li key={h.id}>
                  <span className="font-medium">{ORDER_STATUS_LABELS[h.toStatus]}</span>
                  <span className="block text-xs text-slate-500">
                    {formatDateTime(h.createdAt)} {h.note && `· ${h.note}`}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
