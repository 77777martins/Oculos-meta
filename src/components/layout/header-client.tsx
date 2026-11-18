"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import { useCartCount } from "@/components/providers/cart-store";
import { cn } from "@/lib/utils";
import type { NavCategory } from "@/server/services/navigation";
import { DeliveryZipButton } from "./delivery-zip-button";
import { Logo } from "./logo";
import { QUICK_LINKS } from "./nav-links";
import { SearchBar } from "./search-bar";
import { SideMenu } from "./side-menu";

interface Props {
  storeName: string;
  user: { firstName: string; isStaff: boolean } | null;
  navigation: NavCategory[];
}

/** Área clicável do cabeçalho escuro: contorno branco no hover, como um "botão" de duas linhas. */
const navBox = "rounded-sm border border-transparent px-2 py-1 leading-tight hover:border-white";

export function HeaderClient({ storeName, user, navigation }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const count = useCartCount();
  const categories = navigation.map(({ name, slug }) => ({ name, slug }));

  return (
    <header id="topo" className="text-white">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Pular para o conteúdo
      </a>

      {/* Faixa principal */}
      <div className="bg-ink">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
          <button type="button" className={cn(navBox, "p-1.5 md:hidden")} onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen}>
            <Menu className="size-6" />
          </button>
          <Logo name={storeName} inverted tagline={null} className={cn(navBox, "shrink-0 py-1.5 [&_svg]:size-8")} />
          <DeliveryZipButton className="hidden lg:flex" />
          <SearchBar categories={categories} className="mx-2 hidden flex-1 md:flex" />

          <div className="ml-auto flex items-center md:ml-0">
            <Link href={user ? "/conta" : "/entrar"} className={navBox} aria-label={user ? `Minha conta (${user.firstName})` : "Entrar na sua conta"}>
              <span className="block max-w-32 truncate text-xs text-white/80">Olá, {user ? user.firstName : "faça seu login"}</span>
              <span className="block whitespace-nowrap text-sm font-bold">{user ? "Sua conta" : "Entrar"}</span>
            </Link>
            <Link href="/conta/pedidos" className={cn(navBox, "hidden lg:block")}>
              <span className="block text-xs text-white/80">Devoluções</span>
              <span className="block whitespace-nowrap text-sm font-bold">e Pedidos</span>
            </Link>
            {user?.isStaff && (
              <Link href="/admin" className={cn(navBox, "hidden xl:block")}>
                <span className="block text-xs text-white/80">Equipe</span>
                <span className="block whitespace-nowrap text-sm font-bold">Painel</span>
              </Link>
            )}
            <Link href="/carrinho" className={cn(navBox, "flex items-end gap-1")} aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`}>
              <span className="relative">
                <ShoppingCart className="size-8" aria-hidden />
                <span className="absolute -top-1.5 left-1/2 min-w-5 -translate-x-1/2 text-center text-sm font-bold text-brand-300" aria-hidden>
                  {count > 99 ? "99+" : count}
                </span>
              </span>
              <span className="hidden pb-0.5 text-sm font-bold sm:inline">Carrinho</span>
            </Link>
          </div>
        </div>

        {/* Celular: busca em largura total */}
        <div className="px-3 pb-3 md:hidden">
          <SearchBar categories={categories} className="h-11" />
        </div>
      </div>

      {/* Faixa secundária */}
      <div className="bg-ink-soft">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto px-2 text-sm [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} className={cn(navBox, "hidden shrink-0 items-center gap-1 font-bold md:flex")} aria-expanded={menuOpen}>
            <Menu className="size-5" aria-hidden /> Todos
          </button>
          {navigation.map((c) => (
            <Link key={c.slug} href={`/categorias/${c.slug}`} className={cn(navBox, "shrink-0 whitespace-nowrap py-2")}>
              {c.name}
            </Link>
          ))}
          {QUICK_LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={cn(navBox, "shrink-0 whitespace-nowrap py-2")}>
              {label}
            </Link>
          ))}
        </div>
        <DeliveryZipButton variant="strip" className="border-t border-white/10 lg:hidden" />
      </div>

      {menuOpen && <SideMenu navigation={navigation} user={user} onClose={closeMenu} />}
    </header>
  );
}
