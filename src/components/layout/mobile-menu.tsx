"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavCategory } from "@/server/services/navigation";
import { HELP_LINKS, shopByLinks } from "./mega-menu";
import { Logo } from "./logo";

interface Props {
  storeName: string;
  navigation: NavCategory[];
  isStaff: boolean;
  onClose: () => void;
}

/** Gaveta lateral do celular: coleções em sanfona + atalhos de conta e ajuda. */
export function MobileMenu({ storeName, navigation, isStaff, onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Fechar menu" />
      <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <Logo name={storeName} tagline={null} />
          <button type="button" onClick={onClose} className="p-2 text-slate-600 hover:text-ink" aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Menu móvel" className="flex-1">
          <ul className="border-b border-slate-200">
            {navigation.map((c) => {
              const open = expanded === c.slug;
              const panelId = `menu-${c.slug}`;
              return (
                <li key={c.slug} className="border-b border-slate-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : c.slug)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold uppercase tracking-[0.12em]"
                  >
                    {c.name}
                    <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
                  </button>
                  {open && (
                    <ul id={panelId} className="space-y-1 bg-slate-50 px-5 py-3">
                      {c.products.map((p) => (
                        <MobileLink key={p.slug} href={`/produtos/${p.slug}`} onClose={onClose}>
                          {p.name}
                        </MobileLink>
                      ))}
                      {shopByLinks(`/categorias/${c.slug}`).map(([href, label]) => (
                        <MobileLink key={href} href={href} onClose={onClose} muted>
                          {label}
                        </MobileLink>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <li>
              <Link href="/produtos" onClick={onClose} className="block px-5 py-4 text-sm font-semibold uppercase tracking-[0.12em]">
                Todos os modelos
              </Link>
            </li>
          </ul>

          <ul className="px-5 py-4">
            <MobileLink href="/conta" onClose={onClose}>
              Minha conta
            </MobileLink>
            <MobileLink href="/conta/favoritos" onClose={onClose}>
              Favoritos
            </MobileLink>
            {HELP_LINKS.map(([href, label]) => (
              <MobileLink key={href} href={href} onClose={onClose}>
                {label}
              </MobileLink>
            ))}
            {isStaff && (
              <MobileLink href="/admin" onClose={onClose}>
                Painel administrativo
              </MobileLink>
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function MobileLink({ href, onClose, muted, children }: { href: string; onClose: () => void; muted?: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} onClick={onClose} className={cn("block py-2 text-[15px]", muted ? "text-slate-500" : "text-ink")}>
        {children}
      </Link>
    </li>
  );
}
