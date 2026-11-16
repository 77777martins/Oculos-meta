"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
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
 * Banner principal de tela cheia. Com mais de um banner ativo vira carrossel
 * (troca automática, pausa no hover/foco, sem animação para "menos movimento").
 * No celular a imagem fica em cima e o texto embaixo; no desktop o texto fica sobre a imagem.
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

  return (
    <section
      className="relative bg-ink text-white"
      aria-roledescription={count > 1 ? "carrossel" : undefined}
      aria-label="Destaques da loja"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          role={count > 1 ? "group" : undefined}
          aria-roledescription={count > 1 ? "slide" : undefined}
          aria-label={count > 1 ? `${i + 1} de ${count}` : undefined}
          aria-hidden={i !== index}
          inert={i !== index}
          className={cn("transition-opacity duration-700", i === index ? "relative opacity-100" : "absolute inset-0 opacity-0")}
        >
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-auto lg:h-[min(78vh,760px)]">
            {s.imageUrl && (
              <Image src={s.imageUrl} alt="" fill priority={i === 0} sizes="100vw" className="object-cover object-[72%_50%] lg:object-center" />
            )}
            {/* Escurece a área do texto no desktop para garantir contraste sobre qualquer imagem. */}
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink/85 via-ink/40 to-transparent lg:block" />
          </div>
          <div className="lg:absolute lg:inset-0 lg:flex lg:items-center">
            <div className="container-page py-10 lg:py-0">
              <div className="max-w-xl">
                {i === 0 ? (
                  <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">{s.title}</h1>
                ) : (
                  <h2 className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">{s.title}</h2>
                )}
                {s.subtitle && <p className="mt-5 text-base leading-7 text-white/80 sm:text-lg">{s.subtitle}</p>}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={s.linkUrl ?? "/produtos"} className="inline-flex h-12 items-center bg-white px-8 text-sm font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-white/85">
                    {s.ctaLabel ?? "Comprar agora"}
                  </Link>
                  <Link href="/sobre" className="inline-flex h-12 items-center border border-white/70 px-8 text-sm font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-white hover:text-ink">
                    Sobre a loja
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {count > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-2 lg:bottom-8 lg:right-8">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Mostrar destaque ${i + 1}`}
              aria-current={i === index}
              className={cn("h-1 w-8 transition-colors", i === index ? "bg-white" : "bg-white/40 hover:bg-white/70")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
