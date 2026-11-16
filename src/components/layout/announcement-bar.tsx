"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Announcement {
  text: string;
  href?: string;
}

const ROTATE_MS = 5000;

/**
 * Barra de avisos no topo: um aviso por vez, troca automática a cada 5 s.
 * Pausa com o mouse/foco em cima e não anima para quem pede menos movimento.
 */
export function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;
  const current = items[index % count]!;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className="bg-ink text-white"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Avisos da loja"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-page flex h-9 items-center justify-between gap-2">
        {count > 1 ? (
          <button type="button" onClick={() => go(-1)} className="p-1 text-white/60 hover:text-white" aria-label="Aviso anterior">
            <ChevronLeft className="size-4" />
          </button>
        ) : (
          <span />
        )}
        <p key={index} aria-live={paused ? "polite" : "off"} className="animate-fade-up truncate text-center text-[11px] font-medium uppercase tracking-[0.08em] sm:text-xs sm:tracking-[0.18em]">
          {current.href ? (
            <Link href={current.href} className="underline-offset-4 hover:underline">
              {current.text}
            </Link>
          ) : (
            current.text
          )}
        </p>
        {count > 1 ? (
          <button type="button" onClick={() => go(1)} className="p-1 text-white/60 hover:text-white" aria-label="Próximo aviso">
            <ChevronRight className="size-4" />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
