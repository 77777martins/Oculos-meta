import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { requirePermissionPage } from "@/lib/auth/guards";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { getDashboardMetrics, LOW_STOCK_THRESHOLD } from "@/server/services/admin-metrics";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requirePermissionPage("dashboard:read");
  const { erro } = await searchParams;
  const m = await getDashboardMetrics();

  return (
    <>
      <AdminHeader title="Dashboard" description="Últimos 30 dias — considera apenas pedidos com pagamento aprovado." />
      {erro === "permissao" && <p className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Você não tem permissão para acessar aquela área.</p>}

      {m.alerts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" aria-hidden /> Pagamentos que exigem ação
          </p>
          <ul className="mt-2 list-disc pl-6">
            {m.alerts.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/pedidos/${a.orderId}`} className="underline">
                  Pedido #{a.order.number}
                </Link>{" "}
                — {a.statusDetail === "amount_mismatch" ? "valor divergente do pedido" : "pago, porém cancelado/expirado (verificar estoque ou reembolsar)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Faturamento" value={formatBRL(m.revenue30)} delta={m.revenueDeltaPct} />
        <Stat label="Pedidos pagos" value={String(m.orders30)} />
        <Stat label="Ticket médio" value={formatBRL(m.avgTicket)} />
        <Stat label="Aguardando pagamento" value={String(m.pendingCount)} href="/admin/pedidos?status=PENDING_PAYMENT" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Faturamento diário" className="xl:col-span-2">
          <RevenueChart data={m.daily} />
        </Panel>
        <Panel title="Clientes">
          <p className="font-display text-4xl font-semibold">{m.customers}</p>
          <p className="mt-1 text-sm text-slate-600">{m.newCustomers} novos nos últimos 30 dias</p>
          <Link href="/admin/mensagens" className="mt-6 block rounded-xl bg-surface p-4 text-sm hover:bg-slate-100">
            <span className="font-semibold">{m.unread}</span> mensagens de contato não tratadas
          </Link>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Pedidos recentes" actions={<Link href="/admin/pedidos" className="text-sm font-semibold text-brand-700 hover:underline">Ver todos</Link>}>
          <ul className="divide-y divide-slate-100 text-sm">
            {m.recentOrders.length === 0 && <li className="py-6 text-center text-slate-500">Nenhum pedido ainda.</li>}
            {m.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                  <span className="w-16 font-semibold">#{o.number}</span>
                  <span className="flex-1 truncate text-slate-600">{o.customerName}</span>
                  <OrderStatusBadge status={o.status} />
                  <span className="w-28 text-right font-medium tabular-nums">{formatBRL(o.totalCents)}</span>
                </Link>
                <span className="sr-only">{formatDateTime(o.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={`Estoque baixo (≤ ${LOW_STOCK_THRESHOLD} disponíveis)`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {m.lowStock.length === 0 && <li className="py-6 text-center text-slate-500">Nenhuma variante com estoque baixo.</li>}
            {m.lowStock.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/produtos/${v.productId}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                  <span className="flex-1 truncate">
                    {v.productName} <span className="text-slate-500">— {v.name}</span>
                  </span>
                  <span className="font-mono text-xs text-slate-500">{v.sku}</span>
                  <span className={`w-10 text-right font-semibold ${v.available <= 0 ? "text-red-600" : "text-amber-700"}`}>{v.available}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value, delta, href }: { label: string; value: string; delta?: number | null; href?: string }) {
  const body = (
    <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft transition-shadow hover:shadow-lift">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {delta !== undefined && delta !== null && (
        <p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          {delta >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
          {delta >= 0 ? "+" : ""}
          {delta}% vs. 30 dias anteriores
        </p>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
