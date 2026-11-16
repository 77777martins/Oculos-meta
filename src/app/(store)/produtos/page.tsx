import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/store/catalog-view";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { getActiveCategories } from "@/server/services/catalog";
import { catalogQuerySchema } from "@/lib/validation/catalog";

export const metadata: Metadata = {
  title: "Todos os modelos",
  description: "Catálogo completo de óculos inteligentes: Ray-Ban Meta e outros modelos, com PIX e parcelamento.",
  alternates: { canonical: "/produtos" },
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = catalogQuerySchema.parse(await searchParams);
  const categories = await getActiveCategories();
  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">Todos os modelos</h1>
        <p className="mt-2 text-slate-600">Óculos inteligentes selecionados, com estoque real e envio rastreado.</p>
      </header>
      <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
        <CatalogView filters={filters} basePath="/produtos" categories={categories} />
      </Suspense>
    </div>
  );
}
