import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { CatalogView } from "@/components/store/catalog-view";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { catalogQuerySchema } from "@/lib/validation/catalog";

export const metadata: Metadata = { title: "Buscar", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = catalogQuerySchema.parse(await searchParams);
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">{filters.q ? <>Resultados para “{filters.q}”</> : "Buscar produtos"}</h1>
      <form action="/busca" role="search" className="relative mt-6 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          name="q"
          type="search"
          defaultValue={filters.q}
          maxLength={100}
          autoFocus={!filters.q}
          placeholder="Modelo, cor, SKU…"
          aria-label="Termo de busca"
          className="h-14 w-full rounded-full border border-slate-200 bg-white pl-12 pr-32 text-base shadow-soft focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
        <button type="submit" className="absolute right-2 top-2 h-10 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
          Buscar
        </button>
      </form>
      <div className="mt-10">
        <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
          <CatalogView filters={filters} basePath="/busca" />
        </Suspense>
      </div>
    </div>
  );
}
