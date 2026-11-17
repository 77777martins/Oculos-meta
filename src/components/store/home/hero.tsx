"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
}

const ROTATE_MS = 7000;

/**
 * Carrossel principal de largura total. A base da imagem se funde ao fundo cinza
 * da página, e os cartões da home sobem por cima dela (margem negativa na página).
 * Troca automática com pausa no hover/foco e respeito a "reduzir movimento".
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <section
      className="relative mx-auto max-w-[1500px] overflow-hidden"
      aria-roledescription={count > 1 ? "carrossel" : undefined}
      aria-label="Destaques da loja"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative h-[240px] sm:h-[340px] lg:h-[600px]">
        {slides.map((s, i) => (
          <div
            key={s.id}
            role={count > 1 ? "group" : undefined}
            aria-roledescription={count > 1 ? "slide" : undefined}
            aria-label={count > 1 ? `${i + 1} de ${count}` : undefined}
            aria-hidden={i !== index}
            inert={i !== index}
            className={cn("absolute inset-0 bg-ink transition-opacity duration-700", i === index ? "opacity-100" : "opacity-0")}
          >
            {s.imageUrl && <Image src={s.imageUrl} alt="" fill priority={i === 0} sizes="(max-width: 1500px) 100vw, 1500px" unoptimized={s.imageUrl.startsWith("/images/")} className="object-cover object-[88%_50%]" />}
            <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/30 to-transparent" />
            <div className="absolute inset-x-0 top-0 px-5 pt-6 sm:px-12 sm:pt-12 lg:px-20 lg:pt-14">
              <div className="max-w-[min(32rem,62%)] text-white">
                {i === 0 ? (
                  <h1 className="text-xl font-bold leading-tight sm:text-3xl lg:text-5xl">{s.title}</h1>
                ) : (
                  <h2 className="text-xl font-bold leading-tight sm:text-3xl lg:text-5xl">{s.title}</h2>
                )}
                {s.subtitle && <p className="mt-3 hidden text-lg text-white/85 lg:block">{s.subtitle}</p>}
                <Link href={s.linkUrl ?? "/produtos"} className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink hover:bg-slate-100 sm:mt-6 sm:h-11 sm:px-7">
                  {s.ctaLabel ?? "Comprar agora"}
                </Link>
              </div>
            </div>
          </div>
        ))}
        {/* Fusão com o fundo cinza da página: os cartões da home sobem sobre esta área. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-100 to-transparent" />
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Destaque anterior" className="absolute left-0 top-0 hidden h-[250px] w-20 items-center justify-center text-white/90 hover:text-white focus-visible:outline-2 focus-visible:outline-white lg:flex">
            <ChevronLeft className="size-12" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Próximo destaque" className="absolute right-0 top-0 hidden h-[250px] w-20 items-center justify-center text-white/90 hover:text-white focus-visible:outline-2 focus-visible:outline-white lg:flex">
            <ChevronRight className="size-12" strokeWidth={1.5} />
          </button>
        </>
      )}
    </section>
  );
}
