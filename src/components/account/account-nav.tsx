"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LogOut, MapPin, Package, ShieldCheck, User } from "lucide-react";
import { apiFetch } from "@/lib/http/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/conta", label: "Meus dados", icon: User },
  { href: "/conta/pedidos", label: "Pedidos", icon: Package },
  { href: "/conta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/conta/enderecos", label: "Endereços", icon: MapPin },
  { href: "/conta/privacidade", label: "Privacidade e dados", icon: ShieldCheck },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  return (
    <nav aria-label="Minha conta" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/conta" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors", active ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-100")}>
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        );
      })}
      <button type="button" onClick={logout} className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 lg:mt-4">
        <LogOut className="size-4" aria-hidden /> Sair
      </button>
    </nav>
  );
}
