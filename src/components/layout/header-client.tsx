"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, LayoutDashboard, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useCartCount } from "@/components/providers/cart-store";
import { cn } from "@/lib/utils";
import type { NavCategory } from "@/server/services/navigation";
import { Logo } from "./logo";
import { MegaMenuPanel } from "./mega-menu";
import { MobileMenu } from "./mobile-menu";
import { SearchPanel } from "./search-panel";

interface Props {
  storeName: string;
  user: { firstName: string; isStaff: boolean } | null;
  navigation: NavCategory[];
}

/** Atraso de abertura/fechamento do menu no hover: evita abrir ao só passar o mouse por cima. */
const HOVER_DELAY_MS = 140;

type Panel = { kind: "category"; slug: string } | { kind: "search" } | null;

export function HeaderClient({ storeName, user, navigation }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const count = useCartCount();

  const close = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    setPanel(null);
  }, []);

  const scheduleOpen = (slug: string) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setPanel({ kind: "category", slug }), HOVER_DELAY_MS);
  };
  const scheduleClose = () => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setPanel((p) => (p?.kind === "category" ? null : p)), HOVER_DELAY_MS);
  };

  // Esc fecha qualquer painel; limpeza do timer ao desmontar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(hoverTimer.current);
    };
  }, [close]);

  // Trava a rolagem da página com a gaveta móvel aberta.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const activeCategory = panel?.kind === "category" ? navigation.find((c) => c.slug === panel.slug) : undefined;
  const iconBtn = "inline-flex p-2.5 text-ink transition-opacity hover:opacity-60";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white" onMouseLeave={scheduleClose}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <div className="container-page flex h-16 items-center gap-4 lg:h-[76px]">
        <button type="button" className={cn(iconBtn, "-ml-2.5 lg:hidden")} onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen}>
          <Menu className="size-5" />
        </button>

        <Logo name={storeName} />

        <nav aria-label="Principal" className="ml-10 hidden h-full items-stretch lg:flex">
          {navigation.map((c) => {
            const active = panel?.kind === "category" && panel.slug === c.slug;
            const panelId = `mega-${c.slug}`;
            return (
              <div key={c.slug} className="flex" onMouseEnter={() => scheduleOpen(c.slug)}>
                <button
                  type="button"
                  onClick={() => (active ? close() : setPanel({ kind: "category", slug: c.slug }))}
                  aria-expanded={active}
                  aria-controls={active ? panelId : undefined}
                  className={cn(
                    "relative px-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-ink after:transition-transform",
                    active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                  )}
                >
                  {c.name}
                </button>
              </div>
            );
          })}
          <Link
            href="/produtos"
            onMouseEnter={scheduleClose}
            onClick={close}
            className="relative flex items-center px-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-ink after:transition-transform hover:after:scale-x-100"
          >
            Todos os modelos
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            className={iconBtn}
            onClick={() => setPanel((p) => (p?.kind === "search" ? null : { kind: "search" }))}
            aria-label="Buscar"
            aria-expanded={panel?.kind === "search"}
            aria-controls={panel?.kind === "search" ? "painel-busca" : undefined}
          >
            <Search className="size-5" />
          </button>
          {user?.isStaff && (
            <Link href="/admin" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label="Painel administrativo" title="Painel administrativo">
              <LayoutDashboard className="size-5" />
            </Link>
          )}
          <Link href="/conta/favoritos" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label="Favoritos">
            <Heart className="size-5" />
          </Link>
          <Link href={user ? "/conta" : "/entrar"} className={cn(iconBtn, "items-center gap-2")} aria-label={user ? `Minha conta (${user.firstName})` : "Entrar"}>
            <User className="size-5" />
            <span className="hidden text-sm font-medium xl:inline">{user ? `Olá, ${user.firstName}` : "Entrar"}</span>
          </Link>
          <Link href="/carrinho" className={cn(iconBtn, "relative")} aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold leading-[18px] text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {activeCategory && (
        <div onMouseEnter={() => window.clearTimeout(hoverTimer.current)} className="hidden lg:block">
          <MegaMenuPanel category={activeCategory} id={`mega-${activeCategory.slug}`} onNavigate={close} />
        </div>
      )}
      {panel?.kind === "search" && <SearchPanel categories={navigation} onClose={close} />}

      {mobileOpen && <MobileMenu storeName={storeName} navigation={navigation} isStaff={!!user?.isStaff} onClose={() => setMobileOpen(false)} />}
    </header>
  );
}
