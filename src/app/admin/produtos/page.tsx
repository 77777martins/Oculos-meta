import type { Prisma, ProductStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { requirePermissionPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { effectivePriceCents, formatBRL } from "@/lib/money";
import { clampPage } from "@/lib/utils";
import { AdminHeader, DataTable, FilterBar, filterInput } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Produtos" };
const PER_PAGE = 25;
const STATUS: Record<ProductStatus, string> = { DRAFT: "Rascunho", PUBLISHED: "Publicado", ARCHIVED: "Arquivado" };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requirePermissionPage("products:read");
  const sp = await searchParams;
  const page = clampPage(sp.page);
  const q = sp.q?.trim().slice(0, 100);
  const status = sp.status && sp.status in STATUS ? (sp.status as ProductStatus) : undefined;
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { model: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q.toUpperCase() } } } }] } : {}),
  };
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, name: true, model: true, status: true, isFeatured: true, category: { select: { name: true } }, variants: { select: { priceCents: true, salePriceCents: true, stock: true, reserved: true, isActive: true } } },
    }),
    db.product.count({ where }),
  ]);

  return (
    <>
      <AdminHeader
        title="Produtos e estoque"
        description={`${total} produto(s)`}
        actions={hasPermission(user.role, "products:write") && <ButtonLink href="/admin/produtos/novo"><Plus className="size-4" aria-hidden /> Novo produto</ButtonLink>}
      />
      <FilterBar action="/admin/produtos">
        <label className="text-sm text-slate-600">
          Busca
          <input name="q" defaultValue={q} placeholder="Nome, modelo ou SKU" className={`${filterInput} mt-1 block w-64`} />
        </label>
        <label className="text-sm text-slate-600">
          Status
          <select name="status" defaultValue={status ?? ""} className={`${filterInput} mt-1 block`}>
            <option value="">Todos</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </FilterBar>
      <DataTable
        rows={products}
        rowKey={(p) => p.id}
        rowHref={(p) => `/admin/produtos/${p.id}`}
        columns={[
          { header: "Produto", cell: (p) => p.name },
          { header: "Modelo", cell: (p) => p.model },
          { header: "Categoria", cell: (p) => p.category?.name ?? "—" },
          { header: "Status", cell: (p) => <Badge tone={p.status === "PUBLISHED" ? "success" : "neutral"}>{STATUS[p.status]}</Badge> },
          {
            header: "Preço",
            cell: (p) => {
              const prices = p.variants.filter((v) => v.isActive).map(effectivePriceCents);
              return prices.length ? formatBRL(Math.min(...prices)) : "—";
            },
          },
          {
            header: "Disponível",
            className: "text-right",
            cell: (p) => {
              const avail = p.variants.filter((v) => v.isActive).reduce((a, v) => a + v.stock - v.reserved, 0);
              return <span className={avail <= 0 ? "font-semibold text-red-600" : "tabular-nums"}>{avail}</span>;
            },
          },
        ]}
      />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} buildHref={(p) => `/admin/produtos?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`} />
    </>
  );
}
