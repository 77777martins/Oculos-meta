"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  FolderTree,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import type { Permission } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ title: string; items: Array<{ href: string; label: string; icon: typeof BarChart3; permission: Permission }> }> = [
  {
    title: "Visão geral",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
      { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList, permission: "orders:read" },
      { href: "/admin/pagamentos", label: "Financeiro", icon: CreditCard, permission: "payments:read" },
      { href: "/admin/clientes", label: "Clientes", icon: Users, permission: "customers:read" },
      { href: "/admin/mensagens", label: "Mensagens", icon: Inbox, permission: "messages:read" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/admin/produtos", label: "Produtos e estoque", icon: Boxes, permission: "products:read" },
      { href: "/admin/categorias", label: "Categorias", icon: FolderTree, permission: "categories:write" },
      { href: "/admin/cupons", label: "Cupons", icon: Tag, permission: "coupons:write" },
      { href: "/admin/banners", label: "Banners", icon: Megaphone, permission: "banners:write" },
      { href: "/admin/midia", label: "Imagens", icon: ImageIcon, permission: "media:write" },
    ],
  },
  {
    title: "Operação",
    items: [
      { href: "/admin/frete", label: "Frete", icon: Truck, permission: "shipping:write" },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings, permission: "settings:write" },
      { href: "/admin/usuarios", label: "Equipe", icon: UserCog, permission: "staff:manage" },
      { href: "/admin/privacidade", label: "LGPD", icon: ShieldCheck, permission: "privacy:manage" },
      { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText, permission: "audit:read" },
    ],
  },
];

export function AdminNav({ permissions }: { permissions: Permission[] }) {
  const pathname = usePathname();
  const allowed = new Set(permissions);
  return (
    <nav aria-label="Painel administrativo" className="space-y-6">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => allowed.has(i.permission));
        if (items.length === 0) return null;
        return (
          <div key={g.title}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.title}</p>
            <ul className="mt-2 space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
                      <Icon className="size-4" aria-hidden /> {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
