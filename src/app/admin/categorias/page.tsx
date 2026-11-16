import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/managers";

export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  await requirePermissionPage("categories:write");
  const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: { where: { deletedAt: null } } } } } });
  return (
    <>
      <AdminHeader title="Categorias" description="Organize o catálogo e a navegação da loja." />
      <CategoryManager rows={rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }))} />
    </>
  );
}
