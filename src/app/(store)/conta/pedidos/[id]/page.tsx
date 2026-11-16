import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Package, Truck } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guards";
import { formatBRL } from "@/lib/money";
import { cn, formatDateTime, formatZip, maskCpf } from "@/lib/utils";
import { idSchema } from "@/lib/validation/common";
import { ButtonLink } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { OrderStatusBadge, PaymentStatusBadge, ShipmentStatusBadge } from "@/components/ui/status-badge";
import { ORDER_STATUS_LABELS } from "@/server/services/order-state";
import { expireIfDue, getCustomerOrder, type ShippingAddressSnapshot } from "@/server/services/orders";

export const metadata = { title: "Detalhes do pedido" };

const METHOD_LABEL = { PIX: "PIX", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", BOLETO: "Boleto", OTHER: "Outro" } as const;
const FLOW = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

/** Link oficial de rastreio dos Correios quando o código segue o padrão (AA123456789BR). */
function trackingLink(code: string | null, explicit: string | null): string | null {
  if (explicit) return explicit;
  if (code && /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) return `https://rastreamento.correios.com.br/app/index.php?objeto=${code}`;
  return null;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUserPage(`/conta/pedidos/${id}`);
  await expireIfDue(id);
  // Busca sempre filtrada pelo usuário: pedido de outra pessoa → 404 (anti-IDOR).
  const order = await getCustomerOrder(id, user.id).catch(() => notFound());
  const address = order.shippingAddress as unknown as ShippingAddressSnapshot;
  const currentStep = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const link = trackingLink(order.shipment?.trackingCode ?? null, order.shipment?.trackingUrl ?? null);

  return (
    <div className="space-y-6">
      <Link href="/conta/pedidos" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Voltar aos pedidos
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Pedido #{order.number}</h2>
          <p className="text-sm text-slate-500">Realizado em {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          {order.status === "PENDING_PAYMENT" && <ButtonLink href={`/checkout/pagamento/${order.id}`}>Pagar agora</ButtonLink>}
        </div>
      </header>

      {currentStep >= 0 && (
        <ol className="grid grid-cols-5 gap-2 rounded-3xl border border-slate-100 p-5" aria-label="Andamento do pedido">
          {FLOW.map((step, i) => {
            const done = i <= currentStep;
            return (
              <li key={step} className="flex flex-col items-center text-center">
                {done ? <CheckCircle2 className="size-6 text-brand-600" aria-hidden /> : <Circle className="size-6 text-slate-300" aria-hidden />}
                <span className={cn("mt-2 text-[11px] leading-tight sm:text-xs", done ? "font-semibold text-ink" : "text-slate-400")}>{ORDER_STATUS_LABELS[step]}</span>
              </li>
            );
          })}
        </ol>
      )}

      <section className="rounded-3xl border border-slate-100 p-6" aria-labelledby="entrega">
        <h3 id="entrega" className="flex items-center gap-2 font-semibold">
          <Truck className="size-5 text-brand-600" aria-hidden /> Entrega e rastreamento
        </h3>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div className="text-sm text-slate-600">
            <p className="font-medium text-ink">{address.recipient}</p>
            <p>
              {address.street}, {address.number}
              {address.complement ? ` — ${address.complement}` : ""}
            </p>
            <p>
              {address.district} · {address.city}/{address.state} · {formatZip(address.zipCode)}
            </p>
            {order.shippingCarrier && (
              <p className="mt-2">
                {order.shippingCarrier} {order.shippingService} · {order.shippingMinDays}–{order.shippingMaxDays} dias úteis
              </p>
            )}
          </div>
          <div className="text-sm">
            {order.shipment?.trackingCode ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Código:</span> <span className="font-mono font-semibold">{order.shipment.trackingCode}</span>
                  <ShipmentStatusBadge status={order.shipment.status} />
                </div>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                    Rastrear na transportadora <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </>
            ) : (
              <p className="text-slate-500">O código de rastreio aparecerá aqui assim que o pedido for enviado.</p>
            )}
          </div>
        </div>
        {order.shipment && order.shipment.events.length > 0 && (
          <ol className="mt-6 space-y-4 border-l-2 border-slate-100 pl-5">
            {order.shipment.events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1 size-3 rounded-full bg-brand-600 ring-4 ring-white" aria-hidden />
                <p className="text-sm font-medium">{e.description}</p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(e.occurredAt)}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 p-6" aria-labelledby="itens">
        <h3 id="itens" className="flex items-center gap-2 font-semibold">
          <Package className="size-5 text-brand-600" aria-hidden /> Itens
        </h3>
        <ul className="mt-4 divide-y divide-slate-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-4">
              <ProductImage src={i.imageUrl} alt={i.productName} className="size-16 shrink-0 rounded-xl" sizes="64px" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">{i.productName}</p>
                <p className="text-slate-500">
                  {i.variantName} · SKU {i.sku} · {i.quantity}× {formatBRL(i.unitPriceCents)}
                </p>
              </div>
              <span className="text-sm font-semibold">{formatBRL(i.totalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd>{formatBRL(order.subtotalCents)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Desconto {order.couponCode ? `(${order.couponCode})` : ""}</dt>
              <dd>− {formatBRL(order.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-600">Frete</dt>
            <dd>{order.shippingCents === 0 ? "Grátis" : formatBRL(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatBRL(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 p-6">
          <h3 className="font-semibold">Pagamentos</h3>
          {order.payments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma tentativa de pagamento.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {order.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="text-slate-600">
                    {METHOD_LABEL[p.method]}
                    {p.installments > 1 ? ` · ${p.installments}x` : ""}
                    {p.cardLastFour ? ` · final ${p.cardLastFour}` : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    {p.method === "BOLETO" && p.status === "PENDING" && p.ticketUrl && (
                      <a href={p.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-700 hover:underline">
                        Ver boleto
                      </a>
                    )}
                    <PaymentStatusBadge status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-slate-100 p-6">
          <h3 className="font-semibold">Histórico</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="flex justify-between gap-3">
                <span>{ORDER_STATUS_LABELS[h.toStatus]}</span>
                <span className="text-slate-500">{formatDateTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">CPF: {maskCpf(order.customerDocument)}</p>
        </div>
      </section>
    </div>
  );
}
