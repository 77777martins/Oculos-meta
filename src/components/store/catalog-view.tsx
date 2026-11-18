import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
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

  const activeFilters = (filters.ordem !== "relevancia" ? 1 : 0) + (filters.min !== undefined || filters.max !== undefined ? 1 : 0);
  const chip = (active: boolean) => cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", active ? "border-ink bg-ink text-white" : "border-slate-200 text-slate-700 hover:border-slate-400");

  return (
    <div>
      {/* Filtros recolhidos atrás de um único ícone. <details> nativo: abre e fecha sem JavaScript. */}
      <details className="group border-b border-slate-100 pb-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <p className="text-sm text-slate-600" aria-live="polite">
            {result.total} {result.total === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>
          <span className="relative flex size-11 items-center justify-center rounded-full border border-slate-200 text-ink transition-colors hover:border-slate-400 group-open:border-ink group-open:bg-ink group-open:text-white">
            <SlidersHorizontal className="size-5" aria-hidden />
            <span className="sr-only">Filtros e ordenação{activeFilters > 0 ? ` (${activeFilters} ${activeFilters === 1 ? "ativo" : "ativos"})` : ""}</span>
            {activeFilters > 0 && (
              <span aria-hidden className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {activeFilters}
              </span>
            )}
          </span>
        </summary>

        <div className="mt-5 space-y-6 rounded-2xl bg-slate-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ordenar por</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SORTS.map(([value, label]) => (
                <Link key={value} href={href({ ordem: value === "relevancia" ? undefined : value })} aria-current={filters.ordem === value ? "true" : undefined} className={cn(chip(filters.ordem === value), filters.ordem !== value && "bg-white")}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {categories && categories.length > 0 && (
            <nav aria-label="Categorias">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Coleção</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/produtos" className={cn(chip(basePath === "/produtos"), basePath !== "/produtos" && "bg-white")}>
                  Todos
                </Link>
                {categories.map((c) => {
                  const active = basePath === `/categorias/${c.slug}`;
                  return (
                    <Link key={c.slug} href={`/categorias/${c.slug}`} className={cn(chip(active), !active && "bg-white")}>
                      {c.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}

          <form action={basePath} aria-label="Filtrar por preço">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preço</p>
            {filters.q && <input type="hidden" name="q" value={filters.q} />}
            {filters.ordem !== "relevancia" && <input type="hidden" name="ordem" value={filters.ordem} />}
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm text-slate-600">
                Mínimo (R$)
                <input name="min" type="number" min={0} inputMode="numeric" defaultValue={filters.min} className="mt-1 block h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Máximo (R$)
                <input name="max" type="number" min={0} inputMode="numeric" defaultValue={filters.max} className="mt-1 block h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              </label>
              <button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-700">
                Aplicar
              </button>
              {activeFilters > 0 && (
                <Link href={href({ ordem: undefined, min: undefined, max: undefined })} className="h-10 px-2 text-sm leading-10 text-brand-700 hover:underline">
                  Limpar filtros
                </Link>
              )}
            </div>
          </form>
        </div>
      </details>

      <div className="mt-8">
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
