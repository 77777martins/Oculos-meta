import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatBRL } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/ui/status-badge";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage() {
  const user = await requireUserPage("/conta/pedidos");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, number: true, status: true, totalCents: true, createdAt: true, _count: { select: { items: true } }, shipment: { select: { trackingCode: true } } },
  });

  if (orders.length === 0) {
    return <EmptyState icon={<Package className="size-6" />} title="Você ainda não fez pedidos" description="Quando fizer uma compra, você poderá acompanhá-la aqui." action={<ButtonLink href="/produtos">Ver modelos</ButtonLink>} />;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold">Histórico de pedidos</h2>
      <ul className="mt-6 divide-y divide-slate-100 rounded-3xl border border-slate-100">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/conta/pedidos/${o.id}`} className="flex items-center gap-4 p-5 transition-colors hover:bg-slate-50">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Pedido #{o.number}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(o.createdAt)} · {o._count.items} {o._count.items === 1 ? "item" : "itens"}
                  {o.shipment?.trackingCode ? ` · Rastreio ${o.shipment.trackingCode}` : ""}
                </p>
              </div>
              <span className="font-semibold">{formatBRL(o.totalCents)}</span>
              <ChevronRight className="size-5 text-slate-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
