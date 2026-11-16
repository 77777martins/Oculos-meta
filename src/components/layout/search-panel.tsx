"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";
import { Search, X } from "lucide-react";

/** Painel de busca que desce abaixo do cabeçalho (desktop e celular). */
export function SearchPanel({ categories, onClose }: { categories: Array<{ name: string; slug: string }>; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    onClose();
    router.push(q ? `/busca?q=${encodeURIComponent(q)}` : "/produtos");
  }

  return (
    <div id="painel-busca" className="absolute inset-x-0 top-full border-y border-slate-200 bg-white shadow-[0_24px_40px_-24px_rgb(10_15_30/0.25)]">
      <div className="container-page py-8">
        <form onSubmit={onSubmit} role="search" className="flex items-center gap-3 border-b-2 border-ink pb-3">
          <Search className="size-5 shrink-0 text-slate-500" aria-hidden />
          <input
            ref={inputRef}
            name="q"
            type="search"
            placeholder="O que você procura?"
            aria-label="Buscar produtos"
            maxLength={100}
            className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-slate-400 sm:text-2xl"
          />
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-ink" aria-label="Fechar busca">
            <X className="size-5" />
          </button>
        </form>
        {categories.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Coleções</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categorias/${c.slug}`} onClick={onClose} className="inline-flex h-9 items-center border border-slate-300 px-4 text-sm hover:border-ink">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
