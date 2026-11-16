"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Busca do cabeçalho com seletor de coleção. Sem termo e com coleção escolhida,
 * vai direto para a página da coleção; com termo, filtra a busca pela coleção.
 */
export function SearchBar({ categories, className }: { categories: Array<{ name: string; slug: string }>; className?: string }) {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = String(data.get("q") ?? "").trim().slice(0, 100);
    const categoria = String(data.get("categoria") ?? "");
    const validCategory = categories.some((c) => c.slug === categoria) ? categoria : "";
    if (!q) {
      router.push(validCategory ? `/categorias/${validCategory}` : "/produtos");
      return;
    }
    const qs = new URLSearchParams({ q });
    if (validCategory) qs.set("categoria", validCategory);
    router.push(`/busca?${qs.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={cn("flex h-10 overflow-hidden rounded-md bg-white text-ink focus-within:ring-[3px] focus-within:ring-brand-400", className)}
    >
      <label htmlFor="busca-categoria" className="sr-only">
        Buscar em
      </label>
      <select
        id="busca-categoria"
        name="categoria"
        defaultValue=""
        className="hidden max-w-36 cursor-pointer border-r border-slate-300 bg-slate-100 px-2 text-xs text-slate-700 outline-none hover:bg-slate-200 md:block"
      >
        <option value="">Todos</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        name="q"
        type="search"
        placeholder="Pesquisar modelos, cores e acessórios"
        aria-label="Buscar produtos"
        maxLength={100}
        className="min-w-0 flex-1 px-3 text-[15px] outline-none placeholder:text-slate-400"
      />
      <button type="submit" className="flex w-12 shrink-0 items-center justify-center bg-brand-600 text-white transition-colors hover:bg-brand-700" aria-label="Pesquisar">
        <Search className="size-5" />
      </button>
    </form>
  );
}
