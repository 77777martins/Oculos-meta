import { requirePermissionPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BulkVariantEditor } from "@/components/admin/bulk-variant-editor";
import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD } from "@/server/services/admin-metrics";

const FILTERS = [
  ["todas", "Todas"],
  ["baixo", "Estoque baixo"],
  ["esgotadas", "Esgotadas"],
  ["inativas", "Inativas"],
  ["lente-pendente", "Lente pendente"],
] as const;
type Filter = (typeof FILTERS)[number][0];

export const metadata = { title: "Preços e estoque" };

export default async function BulkPricesPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await requirePermissionPage("products:write");
  const raw = (await searchParams).filtro;
  const filter: Filter = FILTERS.some(([k]) => k === raw) ? (raw as Filter) : "todas";
  const where: Prisma.ProductVariantWhereInput = {
    product: { deletedAt: null },
    ...(filter === "inativas" ? { isActive: false } : {}),
    ...(filter === "lente-pendente" ? { lens: null } : {}),
  };
  const canAdjustStock = hasPermission(user.role, "inventory:write");
  const variants = await db.productVariant.findMany({
    where,
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    select: { id: true, name: true, sku: true, priceCents: true, salePriceCents: true, stock: true, reserved: true, isActive: true, lens: true, product: { select: { name: true } } },
  });
  // Disponível = estoque − reservado: comparação entre colunas, filtrada aqui (catálogo pequeno).
  const shown = variants.filter((v) => {
    const available = v.stock - v.reserved;
    if (filter === "baixo") return v.isActive && available > 0 && available <= LOW_STOCK_THRESHOLD;
    if (filter === "esgotadas") return v.isActive && available <= 0;
    return true;
  });

  return (
    <>
      <AdminHeader title="Preços e estoque" description="Estoque individual de cada cor. Edite várias e salve tudo de uma vez; se qualquer linha for inválida, nada é salvo." />
      <nav aria-label="Filtrar variantes" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={key === "todas" ? "/admin/precos-estoque" : `/admin/precos-estoque?filtro=${key}`}
            aria-current={filter === key ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", filter === key ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {canAdjustStock ? (
        <BulkVariantEditor
          key={filter}
          lowStock={LOW_STOCK_THRESHOLD}
          variants={shown.map((v) => ({ variantId: v.id, productName: v.product.name, variantName: v.name, sku: v.sku, priceCents: v.priceCents, salePriceCents: v.salePriceCents, stock: v.stock, reserved: v.reserved, isActive: v.isActive, lens: v.lens }))}
        />
      ) : (
        <p className="text-sm text-slate-600">Seu perfil não pode ajustar estoque.</p>
      )}
    </>
  );
}
