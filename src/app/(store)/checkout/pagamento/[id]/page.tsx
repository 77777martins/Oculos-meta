import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUserPage } from "@/lib/auth/guards";
import { formatBRL } from "@/lib/money";
import { formatZip } from "@/lib/utils";
import { idSchema } from "@/lib/validation/common";
import { PaymentPanel } from "@/components/checkout/payment-panel";
import { expireIfDue, getCustomerOrder, type ShippingAddressSnapshot } from "@/server/services/orders";
import { getStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Pagamento", robots: { index: false } };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUserPage(`/checkout/pagamento/${id}`);

  await expireIfDue(id);
  const order = await getCustomerOrder(id, user.id).catch(() => notFound());
  if (order.status !== "PENDING_PAYMENT") {
    redirect(order.status === "EXPIRED" || order.status === "CANCELLED" ? `/checkout/falha?pedido=${order.id}&motivo=expirado` : `/conta/pedidos/${order.id}`);
  }

  const settings = await getStoreSettings();
  const pendingPix = order.payments.find((p) => p.method === "PIX" && p.status === "PENDING" && p.pixQrCode && p.expiresAt && p.expiresAt > new Date());
  const address = order.shippingAddress as unknown as ShippingAddressSnapshot;

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">Pagamento</h1>
      <p className="mt-2 text-slate-600">
        Pedido #{order.number} · Total <strong className="text-ink">{formatBRL(order.totalCents)}</strong>
      </p>
      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PaymentPanel
            orderId={order.id}
            orderNumber={order.number}
            totalCents={order.totalCents}
            reservationExpiresAt={order.reservationExpiresAt?.toISOString() ?? null}
            existingPix={pendingPix ? { id: pendingPix.id, status: pendingPix.status, pixQrCode: pendingPix.pixQrCode, pixQrCodeBase64: pendingPix.pixQrCodeBase64, expiresAt: pendingPix.expiresAt!.toISOString() } : null}
            maxInstallments={settings.maxInstallments}
            payerEmail={order.customerEmail}
          />
        </div>
        <aside className="h-fit rounded-3xl border border-slate-100 bg-surface p-6 text-sm">
          <h2 className="text-lg font-semibold">Resumo</h2>
          <ul className="mt-4 space-y-2">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-slate-600">
                  {i.quantity}× {i.productName}
                </span>
                <span className="font-medium">{formatBRL(i.totalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-slate-200 pt-4">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd>{formatBRL(order.subtotalCents)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Desconto</dt>
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
          <div className="mt-4 border-t border-slate-200 pt-4 text-slate-600">
            <p className="font-medium text-ink">Entrega</p>
            <p>
              {address.street}, {address.number} — {address.city}/{address.state} · {formatZip(address.zipCode)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
