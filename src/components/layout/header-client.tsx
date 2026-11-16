"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Heart, LayoutDashboard, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCartCount } from "@/components/providers/cart-store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

interface Props {
  storeName: string;
  user: { firstName: string; isStaff: boolean } | null;
  categories: Array<{ name: string; slug: string }>;
}

export function HeaderClient({ storeName, user, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = useCartCount();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    setOpen(false);
    router.push(q ? `/busca?q=${encodeURIComponent(q)}` : "/produtos");
  }

  const nav: Array<{ href: string; label: string; wideOnly?: boolean }> = [
    { href: "/produtos", label: "Modelos" },
    ...categories.slice(0, 3).map((c, i) => ({ href: `/categorias/${c.slug}`, label: c.name, wideOnly: i >= 1 })),
    { href: "/sobre", label: "Sobre" },
  ];

  return (
    <header className={cn("sticky top-0 z-50 transition-all duration-300", scrolled ? "glass border-b border-slate-200/70 shadow-soft" : "bg-white")}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <div className="container-page flex h-16 items-center gap-4 lg:h-[72px]">
        <button type="button" className="-ml-2 rounded-full p-2 text-slate-700 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}>
          <Menu className="size-5" />
        </button>

        <Logo name={storeName} />

        <nav aria-label="Principal" className="ml-6 hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors",
                item.wideOnly && "hidden xl:inline-flex",
                pathname === item.href ? "bg-slate-100 text-ink" : "text-slate-600 hover:bg-slate-50 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form onSubmit={onSearch} role="search" className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              name="q"
              type="search"
              placeholder="Buscar modelos"
              aria-label="Buscar produtos"
              maxLength={100}
              className="h-10 w-44 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm transition-all xl:w-56 focus:w-64 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </form>
          {user?.isStaff && (
            <Link href="/admin" className="hidden rounded-full p-2.5 text-slate-700 hover:bg-slate-100 sm:inline-flex" aria-label="Painel administrativo" title="Painel administrativo">
              <LayoutDashboard className="size-5" />
            </Link>
          )}
          <Link href="/conta/favoritos" className="hidden rounded-full p-2.5 text-slate-700 hover:bg-slate-100 sm:inline-flex" aria-label="Favoritos">
            <Heart className="size-5" />
          </Link>
          <Link href={user ? "/conta" : "/entrar"} className="inline-flex items-center gap-2 rounded-full p-2.5 text-slate-700 hover:bg-slate-100" aria-label={user ? `Minha conta (${user.firstName})` : "Entrar"}>
            <User className="size-5" />
            <span className="hidden text-sm font-medium xl:inline">{user ? `Olá, ${user.firstName}` : "Entrar"}</span>
          </Link>
          <Link href="/carrinho" className="relative inline-flex rounded-full p-2.5 text-slate-700 hover:bg-slate-100" aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold leading-[18px] text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-fade-up flex-col bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Logo name={storeName} />
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Fechar menu">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={onSearch} role="search" className="relative mt-6">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input name="q" type="search" placeholder="Buscar modelos" aria-label="Buscar produtos" maxLength={100} className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-[15px] focus:border-brand-400 focus:outline-none" />
            </form>
            <nav aria-label="Menu móvel" className="mt-6 flex flex-col">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium text-slate-800 hover:bg-slate-50">
                  {item.label}
                </Link>
              ))}
              <hr className="my-3 border-slate-100" />
              <Link href="/conta/favoritos" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base text-slate-700 hover:bg-slate-50">
                Favoritos
              </Link>
              <Link href="/conta/pedidos" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base text-slate-700 hover:bg-slate-50">
                Meus pedidos
              </Link>
              <Link href="/contato" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base text-slate-700 hover:bg-slate-50">
                Atendimento
              </Link>
              {user?.isStaff && (
                <Link href="/admin" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50">
                  Painel administrativo
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
