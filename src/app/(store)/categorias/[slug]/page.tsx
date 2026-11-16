import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogView } from "@/components/store/catalog-view";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { getActiveCategories } from "@/server/services/catalog";
import { catalogQuerySchema } from "@/lib/validation/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function findCategory(slug: string) {
  const categories = await getActiveCategories();
  return { category: categories.find((c) => c.slug === slug), categories };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await findCategory((await params).slug);
  if (!category) return { title: "Categoria não encontrada" };
  return { title: category.name, description: category.description ?? `Óculos inteligentes — ${category.name}.`, alternates: { canonical: `/categorias/${category.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { category, categories } = await findCategory(slug);
  if (!category) notFound();
  const filters = { ...catalogQuerySchema.parse(await searchParams), categoria: category.slug };
  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Categoria</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-2xl text-slate-600">{category.description}</p>}
      </header>
      <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
        <CatalogView filters={filters} basePath={`/categorias/${category.slug}`} categories={categories} />
      </Suspense>
    </div>
  );
}
