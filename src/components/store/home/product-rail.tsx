"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassesArt } from "@/components/ui/glasses-art";
import { Price } from "@/components/ui/price";
import type { ProductCardData } from "@/server/services/catalog";

/**
 * Faixa horizontal de produtos em painel branco. Rolagem nativa com scroll-snap
 * (toque, trackpad e teclado); as setas aparecem só no desktop.
 */
export function ProductRail({ title, products, viewAllHref }: { title: string; products: ProductCardData[]; viewAllHref: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  if (products.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/rail relative bg-white p-5" aria-label={title}>
      <div className="flex items-baseline gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link href={viewAllHref} className="text-sm font-medium text-brand-700 hover:underline">
          Ver mais
        </Link>
      </div>
      <ul ref={scroller} className="relative mt-4 flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:thin]">
        {products.map((p, i) => (
          <li key={p.id} className="w-40 shrink-0 snap-start sm:w-52">
            <Link href={`/produtos/${p.slug}`} className="group block" aria-label={`${p.name} — ver detalhes`}>
              <div className="relative aspect-square bg-slate-50">
                {p.image ? (
                  <Image src={p.image.url} alt={p.image.alt} fill sizes="208px" priority={i < 2} className="object-contain p-3" />
                ) : (
                  <div className="flex h-full items-center justify-center p-4">
                    <GlassesArt />
                  </div>
                )}
                {!p.inStock && <span className="absolute left-2 top-2 bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Esgotado</span>}
                {p.inStock && p.listPriceCents > p.priceCents && <span className="absolute left-2 top-2 bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">Oferta</span>}
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-800 group-hover:text-brand-700">{p.name}</p>
              <Price cents={p.priceCents} listCents={p.listPriceCents} size="sm" className="mt-1" />
            </Link>
          </li>
        ))}
      </ul>
      <RailArrow side="left" onClick={() => scrollBy(-1)} />
      <RailArrow side="right" onClick={() => scrollBy(1)} />
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
      className={`absolute top-1/2 hidden h-24 w-11 -translate-y-1/2 items-center justify-center border border-slate-200 bg-white/95 opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover/rail:opacity-100 lg:flex ${side === "left" ? "left-0 rounded-r-md" : "right-0 rounded-l-md"}`}
    >
      <Icon className="size-6" />
    </button>
  );
}
