import Link from "next/link";
import { SearchX } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ButtonLink } from "@/components/ui/button";
import { listProducts, type CatalogFilters } from "@/server/services/catalog";
import { cn } from "@/lib/utils";

const SORTS = [
  ["relevancia", "Relevância"],
  ["novidades", "Novidades"],
  ["menor-preco", "Menor preço"],
  ["maior-preco", "Maior preço"],
] as const;

/** Listagem reutilizada por Catálogo, Categoria e Busca. Filtros via URL (compartilháveis e indexáveis). */
export async function CatalogView({ filters, basePath, categories }: { filters: CatalogFilters; basePath: string; categories?: Array<{ name: string; slug: string }> }) {
  const result = await listProducts(filters);

  const href = (patch: Partial<Record<string, string | number | undefined>>) => {
    const params = new URLSearchParams();
    const merged = { q: filters.q, ordem: filters.ordem === "relevancia" ? undefined : filters.ordem, min: filters.min, max: filters.max, page: undefined as number | undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600" aria-live="polite">
          {result.total} {result.total === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Ordenar:</span>
          {SORTS.map(([value, label]) => (
            <Link
              key={value}
              href={href({ ordem: value === "relevancia" ? undefined : value })}
              aria-current={filters.ordem === value ? "true" : undefined}
              className={cn("rounded-full px-3 py-1.5 text-sm font-medium", filters.ordem === value ? "bg-ink text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {categories && categories.length > 0 && (
        <nav aria-label="Categorias" className="mt-6 flex gap-2 overflow-x-auto pb-2">
          <Link href="/produtos" className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", basePath === "/produtos" ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-700 hover:border-slate-300")}>
            Todos
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categorias/${c.slug}`}
              className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", basePath === `/categorias/${c.slug}` ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-700 hover:border-slate-300")}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      <form action={basePath} className="mt-6 flex flex-wrap items-end gap-3" aria-label="Filtrar por preço">
        {filters.q && <input type="hidden" name="q" value={filters.q} />}
        {filters.ordem !== "relevancia" && <input type="hidden" name="ordem" value={filters.ordem} />}
        <label className="text-sm text-slate-600">
          Preço mín. (R$)
          <input name="min" type="number" min={0} inputMode="numeric" defaultValue={filters.min} className="mt-1 block h-10 w-32 rounded-xl border border-slate-200 px-3 text-sm" />
        </label>
        <label className="text-sm text-slate-600">
          Preço máx. (R$)
          <input name="max" type="number" min={0} inputMode="numeric" defaultValue={filters.max} className="mt-1 block h-10 w-32 rounded-xl border border-slate-200 px-3 text-sm" />
        </label>
        <button type="submit" className="h-10 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-700">
          Filtrar
        </button>
        {(filters.min !== undefined || filters.max !== undefined) && (
          <Link href={href({ min: undefined, max: undefined })} className="h-10 px-2 text-sm leading-10 text-brand-700 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <div className="mt-10">
        {result.items.length > 0 ? (
          <>
            <ProductGrid products={result.items} />
            <Pagination page={result.page} pages={result.pages} buildHref={(p) => href({ page: p > 1 ? p : undefined })} />
          </>
        ) : (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="Nenhum produto encontrado"
            description={filters.q ? `Não encontramos resultados para “${filters.q}”. Tente outro termo.` : "Ajuste os filtros para ver mais opções."}
            action={<ButtonLink href="/produtos" variant="outline">Ver todos os modelos</ButtonLink>}
          />
        )}
      </div>
    </div>
  );
}
