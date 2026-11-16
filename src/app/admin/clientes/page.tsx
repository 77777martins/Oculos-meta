import type { Prisma } from "@prisma/client";
import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { clampPage, formatDate } from "@/lib/utils";
import { AdminHeader, DataTable, FilterBar, filterInput } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Clientes" };
const PER_PAGE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePermissionPage("customers:read");
  const sp = await searchParams;
  const page = clampPage(sp.page);
  const q = sp.q?.trim().slice(0, 100);
  const where: Prisma.UserWhereInput = { anonymizedAt: null, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: { id: true, name: true, email: true, role: true, createdAt: true, lastLoginAt: true, _count: { select: { orders: true } } } }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <AdminHeader title="Clientes" description={`${total} conta(s) ativas`} />
      <FilterBar action="/admin/clientes">
        <label className="text-sm text-slate-600">
          Busca
          <input name="q" defaultValue={q} placeholder="Nome ou e-mail" className={`${filterInput} mt-1 block w-64`} />
        </label>
      </FilterBar>
      <DataTable
        rows={users}
        rowKey={(u) => u.id}
        rowHref={(u) => `/admin/clientes/${u.id}`}
        columns={[
          { header: "Nome", cell: (u) => u.name },
          { header: "E-mail", cell: (u) => u.email },
          { header: "Pedidos", cell: (u) => u._count.orders },
          { header: "Cadastro", cell: (u) => formatDate(u.createdAt) },
          { header: "Último acesso", cell: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : "—") },
        ]}
      />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} buildHref={(p) => `/admin/clientes?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`} />
    </>
  );
}
