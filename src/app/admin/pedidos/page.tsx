import type { OrderStatus, Prisma } from "@prisma/client";
import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { clampPage, formatDateTime } from "@/lib/utils";
import { AdminHeader, DataTable, FilterBar, filterInput } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { ORDER_STATUS_LABELS } from "@/server/services/order-state";

export const metadata = { title: "Pedidos" };
const PER_PAGE = 25;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requirePermissionPage("orders:read");
  const sp = await searchParams;
  const page = clampPage(sp.page);
  const status = sp.status && sp.status in ORDER_STATUS_LABELS ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim().slice(0, 100);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            ...(/^\d{1,9}$/.test(q.replace("#", "")) ? [{ number: Number(q.replace("#", "")) }] : []),
            { customerEmail: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: { id: true, number: true, status: true, totalCents: true, customerName: true, customerEmail: true, createdAt: true, _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    return `/admin/pedidos${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <AdminHeader title="Pedidos" description={`${total} pedido(s)`} />
      <FilterBar action="/admin/pedidos">
        <label className="text-sm text-slate-600">
          Busca
          <input name="q" defaultValue={q} placeholder="Nº, nome ou e-mail" className={`${filterInput} mt-1 block w-64`} />
        </label>
        <label className="text-sm text-slate-600">
          Status
          <select name="status" defaultValue={status ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">Todos</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      <DataTable
        rows={orders}
        rowKey={(o) => o.id}
        rowHref={(o) => `/admin/pedidos/${o.id}`}
        columns={[
          { header: "Pedido", cell: (o) => `#${o.number}` },
          { header: "Cliente", cell: (o) => (<><span className="block font-medium">{o.customerName}</span><span className="text-xs text-slate-500">{o.customerEmail}</span></>) },
          { header: "Data", cell: (o) => formatDateTime(o.createdAt) },
          { header: "Itens", cell: (o) => o._count.items },
          { header: "Status", cell: (o) => <OrderStatusBadge status={o.status} /> },
          { header: "Total", cell: (o) => <span className="font-semibold tabular-nums">{formatBRL(o.totalCents)}</span>, className: "text-right" },
        ]}
      />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} buildHref={qs} />
    </>
  );
}
