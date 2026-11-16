import type { PaymentStatus, Prisma } from "@prisma/client";
import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { clampPage, formatDateTime } from "@/lib/utils";
import { AdminHeader, DataTable, FilterBar, filterInput } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { PAYMENT_STATUS_LABELS } from "@/server/services/order-state";
import { getFinancialSummary } from "@/server/services/admin-metrics";

export const metadata = { title: "Financeiro" };
const PER_PAGE = 30;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requirePermissionPage("payments:read");
  const sp = await searchParams;
  const page = clampPage(sp.page);
  const status = sp.status && sp.status in PAYMENT_STATUS_LABELS ? (sp.status as PaymentStatus) : undefined;
  const where: Prisma.PaymentWhereInput = status ? { status } : {};
  const [payments, total, summary] = await Promise.all([
    db.payment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { order: { select: { id: true, number: true, customerName: true } } } }),
    db.payment.count({ where }),
    getFinancialSummary(),
  ]);

  return (
    <>
      <AdminHeader title="Financeiro" description="Histórico de pagamentos processados pelo Mercado Pago." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Aprovado (30 dias)", formatBRL(summary.gross)],
          ["Reembolsado (30 dias)", formatBRL(summary.refunds)],
          ["Líquido (30 dias)", formatBRL(summary.net)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft">
            <p className="text-sm text-slate-500">{l}</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <p className="mb-4 text-xs text-slate-500">Valores brutos, antes das tarifas do Mercado Pago. Consulte o extrato no painel do provedor para valores líquidos de taxas.</p>
      <FilterBar action="/admin/pagamentos">
        <label className="text-sm text-slate-600">
          Status
          <select name="status" defaultValue={status ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">Todos</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </FilterBar>
      <DataTable
        rows={payments}
        rowKey={(p) => p.id}
        rowHref={(p) => `/admin/pedidos/${p.order.id}`}
        columns={[
          { header: "Pedido", cell: (p) => `#${p.order.number}` },
          { header: "Cliente", cell: (p) => p.order.customerName },
          { header: "Método", cell: (p) => `${p.method}${p.installments > 1 ? ` ${p.installments}x` : ""}` },
          { header: "ID Mercado Pago", cell: (p) => <span className="font-mono text-xs">{p.providerPaymentId ?? "—"}</span> },
          { header: "Data", cell: (p) => formatDateTime(p.createdAt) },
          { header: "Status", cell: (p) => <PaymentStatusBadge status={p.status} /> },
          { header: "Valor", className: "text-right", cell: (p) => <span className="tabular-nums">{formatBRL(p.amountCents)}{p.refundedCents > 0 && <span className="block text-xs text-red-600">− {formatBRL(p.refundedCents)}</span>}</span> },
        ]}
      />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} buildHref={(p) => `/admin/pagamentos?${new URLSearchParams({ ...(status ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`} />
    </>
  );
}
