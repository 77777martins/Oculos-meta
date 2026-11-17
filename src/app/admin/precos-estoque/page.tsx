import { requirePermissionPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { BulkVariantEditor } from "@/components/admin/bulk-variant-editor";

export const metadata = { title: "Preços e estoque" };

export default async function BulkPricesPage() {
  const user = await requirePermissionPage("products:write");
  const canAdjustStock = hasPermission(user.role, "inventory:write");
  const variants = await db.productVariant.findMany({
    where: { product: { deletedAt: null } },
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    select: { id: true, name: true, sku: true, priceCents: true, salePriceCents: true, stock: true, reserved: true, product: { select: { name: true } } },
  });

  return (
    <>
      <AdminHeader title="Preços e estoque" description="Edite várias variantes e salve tudo de uma vez. Se qualquer linha for inválida, nada é salvo." />
      {canAdjustStock ? (
        <BulkVariantEditor
          variants={variants.map((v) => ({ variantId: v.id, productName: v.product.name, variantName: v.name, sku: v.sku, priceCents: v.priceCents, salePriceCents: v.salePriceCents, stock: v.stock, reserved: v.reserved }))}
        />
      ) : (
        <p className="text-sm text-slate-600">Seu perfil não pode ajustar estoque.</p>
      )}
    </>
  );
}
