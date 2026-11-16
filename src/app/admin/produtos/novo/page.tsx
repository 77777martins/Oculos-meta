import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requirePermissionPage("products:write");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <AdminHeader title="Novo produto" />
      <ProductForm categories={categories} />
    </>
  );
}
