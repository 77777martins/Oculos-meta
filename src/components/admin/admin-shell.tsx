"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import type { Permission } from "@/lib/auth/rbac";
import { AdminNav } from "./admin-nav";

export function AdminShell({ permissions, user, children }: { permissions: Permission[]; user: { name: string; roleLabel: string }; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o menu móvel ao navegar
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col bg-ink p-4 text-white">
      <Link href="/admin" className="flex items-center gap-2 px-3 py-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-900 text-xs font-bold">OM</span>
        <span className="font-display font-semibold">Admin</span>
      </Link>
      <div className="mt-6 flex-1 overflow-y-auto">
        <AdminNav permissions={permissions} />
      </div>
      <div className="mt-4 border-t border-white/10 px-3 pt-4 text-sm">
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-slate-400">{user.roleLabel}</p>
        <Link href="/" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-300 hover:text-white">
          Ver loja <ExternalLink className="size-3" aria-hidden />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" className="rounded-lg p-2 hover:bg-slate-100">
          <Menu className="size-5" />
        </button>
        <span className="font-display font-semibold">Painel administrativo</span>
        <span className="w-9" />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <div className="absolute inset-y-0 left-0 w-72">
            {sidebar}
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-white hover:bg-white/10" aria-label="Fechar menu">
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
      <main id="conteudo" className="min-w-0 p-4 sm:p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
