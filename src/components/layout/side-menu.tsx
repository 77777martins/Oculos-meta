"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavCategory } from "@/server/services/navigation";
import { HELP_LINKS, shopByLinks } from "./nav-links";

interface Props {
  navigation: NavCategory[];
  user: { firstName: string; isStaff: boolean } | null;
  onClose: () => void;
}

/** Menu lateral "Todos": coleções em sanfona, conta e ajuda. Usado no desktop e no celular. */
export function SideMenu({ navigation, user, onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Fechar menu" />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-[360px] animate-fade-up flex-col bg-white text-ink shadow-2xl">
        <div className="flex items-center gap-3 bg-ink-soft px-5 py-4 text-white">
          <UserCircle2 className="size-7 shrink-0" aria-hidden />
          <Link href={user ? "/conta" : "/entrar"} onClick={onClose} className="flex-1 text-lg font-semibold">
            Olá, {user ? user.firstName : "faça seu login"}
          </Link>
          <button ref={closeRef} type="button" onClick={onClose} className="p-1 text-white/80 hover:text-white" aria-label="Fechar menu">
            <X className="size-6" />
          </button>
        </div>

        <nav aria-label="Todas as categorias" className="flex-1 overflow-y-auto pb-6">
          <Section title="Compre por coleção">
            {navigation.map((c) => {
              const open = expanded === c.slug;
              const panelId = `menu-${c.slug}`;
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : c.slug)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between px-5 py-3 text-left text-[15px] hover:bg-slate-100"
                  >
                    {c.name}
                    <ChevronDown className={cn("size-4 text-slate-500 transition-transform", open && "rotate-180")} aria-hidden />
                  </button>
                  {open && (
                    <ul id={panelId} className="bg-slate-50 py-1">
                      {c.products.map((p) => (
                        <MenuLink key={p.slug} href={`/produtos/${p.slug}`} onClose={onClose} indent>
                          {p.name}
                        </MenuLink>
                      ))}
                      {shopByLinks(`/categorias/${c.slug}`).map(([href, label]) => (
                        <MenuLink key={href} href={href} onClose={onClose} indent muted>
                          {label}
                        </MenuLink>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <MenuLink href="/produtos" onClose={onClose}>
              Todos os modelos
            </MenuLink>
          </Section>

          <Section title="Sua conta">
            <MenuLink href={user ? "/conta" : "/entrar"} onClose={onClose}>
              {user ? "Minha conta" : "Entrar ou criar conta"}
            </MenuLink>
            <MenuLink href="/conta/pedidos" onClose={onClose}>
              Meus pedidos
            </MenuLink>
            <MenuLink href="/conta/favoritos" onClose={onClose}>
              Favoritos
            </MenuLink>
            {user?.isStaff && (
              <MenuLink href="/admin" onClose={onClose}>
                Painel administrativo
              </MenuLink>
            )}
          </Section>

          <Section title="Ajuda e atendimento">
            {HELP_LINKS.map(([href, label]) => (
              <MenuLink key={href} href={href} onClose={onClose}>
                {label}
              </MenuLink>
            ))}
          </Section>
        </nav>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-200 py-3 last:border-0">
      <p className="px-5 pb-1 pt-2 text-lg font-bold">{title}</p>
      <ul>{children}</ul>
    </div>
  );
}

function MenuLink({ href, onClose, indent, muted, children }: { href: string; onClose: () => void; indent?: boolean; muted?: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} onClick={onClose} className={cn("block py-3 text-[15px] hover:bg-slate-100", indent ? "px-8 py-2" : "px-5", muted ? "text-slate-500" : "text-ink")}>
        {children}
      </Link>
    </li>
  );
}
