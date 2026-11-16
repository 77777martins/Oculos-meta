import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { clampPage, formatDateTime } from "@/lib/utils";
import { AdminHeader, DataTable, FilterBar, filterInput } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Auditoria" };
const PER_PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  await requirePermissionPage("audit:read");
  const sp = await searchParams;
  const page = clampPage(sp.page);
  const action = sp.action?.trim().slice(0, 80);
  const where = action ? { action: { startsWith: action } } : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { actor: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <AdminHeader title="Logs de auditoria" description="Registro imutável de ações sensíveis. IPs armazenados apenas como hash (LGPD)." />
      <FilterBar action="/admin/auditoria">
        <label className="text-sm text-slate-600">
          Ação (prefixo)
          <input name="action" defaultValue={action} placeholder="auth., order., payment." className={`${filterInput} mt-1 block w-64`} />
        </label>
      </FilterBar>
      <DataTable
        rows={logs}
        rowKey={(l) => l.id}
        columns={[
          { header: "Data", cell: (l) => formatDateTime(l.createdAt) },
          { header: "Ação", cell: (l) => <span className="font-mono text-xs">{l.action}</span> },
          { header: "Autor", cell: (l) => l.actor?.email ?? "sistema" },
          { header: "Entidade", cell: (l) => <span className="text-xs">{l.entityType} {l.entityId && <span className="font-mono text-slate-500">{l.entityId}</span>}</span> },
          { header: "Detalhes", cell: (l) => <span className="font-mono text-xs text-slate-500">{l.metadata ? JSON.stringify(l.metadata).slice(0, 120) : "—"}</span> },
        ]}
      />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} buildHref={(p) => `/admin/auditoria?${new URLSearchParams({ ...(action ? { action } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`} />
    </>
  );
}
