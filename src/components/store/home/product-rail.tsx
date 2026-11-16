"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/server/services/catalog";

const ALL = "Todos";

/**
 * Vitrine em faixa rolável com abas por coleção. A rolagem usa scroll-snap
 * nativo (funciona com toque, trackpad e teclado); as setas só aceleram no desktop.
 */
export function ProductRail({ title, products, viewAllHref }: { title: string; products: ProductCardData[]; viewAllHref: string }) {
  const tabs = useMemo(() => [ALL, ...new Set(products.map((p) => p.category).filter((c): c is string => !!c))], [products]);
  const [tab, setTab] = useState(ALL);
  const scroller = useRef<HTMLDivElement>(null);
  const visible = tab === ALL ? products : products.filter((p) => p.category === tab);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="vitrine-titulo">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="vitrine-titulo" className="text-2xl font-semibold uppercase tracking-[0.08em] sm:text-3xl">
          {title}
        </h2>
        <Link href={viewAllHref} className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
          Ver todos <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {tabs.length > 2 && (
        <div role="tablist" aria-label="Filtrar por coleção" className="mt-6 flex gap-6 overflow-x-auto border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              aria-controls="vitrine-lista"
              onClick={() => {
                setTab(t);
                scroller.current?.scrollTo({ left: 0 });
              }}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition-colors",
                t === tab ? "border-ink text-ink" : "border-transparent text-slate-500 hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="relative mt-8">
        <div
          id="vitrine-lista"
          ref={scroller}
          role="tabpanel"
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 sm:-mx-6 sm:gap-6 sm:px-6 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((p, i) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc(25%-18px)]">
              <ProductCard product={p} priority={i < 2} />
            </div>
          ))}
        </div>
        {visible.length > 4 && (
          <>
            <RailArrow side="left" onClick={() => scrollBy(-1)} />
            <RailArrow side="right" onClick={() => scrollBy(1)} />
          </>
        )}
      </div>
    </section>
  );
}

function RailArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Ver anteriores" : "Ver próximos"}
      className={cn(
        "absolute top-[38%] hidden size-11 -translate-y-1/2 items-center justify-center border border-slate-200 bg-white shadow-sm transition-colors hover:border-ink lg:flex",
        side === "left" ? "-left-5" : "-right-5",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
