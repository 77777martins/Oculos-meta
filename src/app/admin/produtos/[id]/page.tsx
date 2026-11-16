import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermissionPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { idSchema } from "@/lib/validation/common";
import type { ProductInput } from "@/lib/validation/catalog";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { StockPanel } from "@/components/admin/stock-panel";
import { ArchiveProductButton } from "@/components/admin/archive-product-button";

export const metadata = { title: "Editar produto" };

const MOVEMENT_LABELS = { RESTOCK: "Entrada", ADJUSTMENT: "Ajuste", RESERVE: "Reserva", RELEASE: "Liberação", SALE: "Venda", RETURN: "Devolução" } as const;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermissionPage("products:read");
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [product, categories, movements] = await Promise.all([
    db.product.findFirst({ where: { id, deletedAt: null }, include: { variants: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.inventoryMovement.findMany({ where: { variant: { productId: id } }, orderBy: { createdAt: "desc" }, take: 30, include: { variant: { select: { sku: true } } } }),
  ]);
  if (!product) notFound();
  const canWrite = hasPermission(user.role, "products:write");

  const initial: ProductInput = {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    model: product.model,
    shortDescription: product.shortDescription,
    description: product.description,
    specs: Array.isArray(product.specs) ? (product.specs as Array<{ label: string; value: string }>) : [],
    status: product.status,
    isFeatured: product.isFeatured,
    categoryId: product.categoryId,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    images: product.images.map((i) => ({
      url: i.url,
      alt: i.alt,
      variantSku: product.variants.find((v) => v.id === i.variantId)?.sku ?? null,
      credit: i.credit,
      creditUrl: i.creditUrl,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      color: v.color,
      colorHex: v.colorHex,
      lens: v.lens,
      size: v.size,
      priceCents: v.priceCents,
      salePriceCents: v.salePriceCents,
      weightGrams: v.weightGrams,
      isActive: v.isActive,
    })),
  };

  return (
    <>
      <AdminHeader
        title={product.name}
        description={
          <>
            Atualizado em {formatDateTime(product.updatedAt)} ·{" "}
            {product.status === "PUBLISHED" && (
              <Link href={`/produtos/${product.slug}`} target="_blank" className="text-brand-700 hover:underline">
                Ver na loja
              </Link>
            )}
          </>
        }
        actions={canWrite && <ArchiveProductButton productId={product.id} />}
      />
      {canWrite ? <ProductForm productId={product.id} initial={initial} categories={categories} /> : <p className="mb-6 text-sm text-slate-500">Somente leitura.</p>}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Estoque">
          <StockPanel variants={product.variants.map((v) => ({ id: v.id, sku: v.sku, name: v.name, stock: v.stock, reserved: v.reserved }))} canWrite={hasPermission(user.role, "inventory:write")} />
        </Panel>
        <Panel title="Movimentações recentes">
          <ul className="divide-y divide-slate-100 text-sm">
            {movements.length === 0 && <li className="py-4 text-slate-500">Sem movimentações.</li>}
            {movements.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 py-2">
                <span>
                  {MOVEMENT_LABELS[m.type]} · <span className="font-mono text-xs">{m.variant.sku}</span>
                  <span className="block text-xs text-slate-500">{m.reason}</span>
                </span>
                <span className="text-right">
                  <span className={m.quantity >= 0 ? "text-emerald-700" : "text-red-600"}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</span>
                  <span className="block text-xs text-slate-500">{formatDateTime(m.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
