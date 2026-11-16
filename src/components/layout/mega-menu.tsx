import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { GlassesArt } from "@/components/ui/glasses-art";
import type { NavCategory } from "@/server/services/navigation";

export const HELP_LINKS: Array<[href: string, label: string]> = [
  ["/faq", "Perguntas frequentes"],
  ["/conta/pedidos", "Rastrear pedido"],
  ["/trocas-e-devolucoes", "Trocas e devoluções"],
  ["/contato", "Fale conosco"],
];

export function shopByLinks(base: string): Array<[href: string, label: string]> {
  return [
    [`${base}?ordem=novidades`, "Novidades"],
    [`${base}?ordem=relevancia`, "Destaques"],
    [`${base}?ordem=menor-preco`, "Menor preço"],
    [base, "Ver tudo"],
  ];
}

/** Painel de colunas aberto a partir de um item do menu principal (desktop). */
export function MegaMenuPanel({ category, id, onNavigate }: { category: NavCategory; id: string; onNavigate: () => void }) {
  const base = `/categorias/${category.slug}`;
  return (
    <div id={id} className="absolute inset-x-0 top-full border-y border-slate-200 bg-white shadow-[0_24px_40px_-24px_rgb(10_15_30/0.25)]">
      <div className="container-page grid grid-cols-12 gap-8 py-10">
        <MenuColumn title="Modelos" className="col-span-3">
          {category.products.length > 0 ? (
            category.products.map((p) => (
              <MenuLink key={p.slug} href={`/produtos/${p.slug}`} onNavigate={onNavigate}>
                {p.name}
              </MenuLink>
            ))
          ) : (
            <li className="text-sm text-slate-500">Novos modelos em breve.</li>
          )}
        </MenuColumn>
        <MenuColumn title="Comprar por" className="col-span-3">
          {shopByLinks(base).map(([href, label]) => (
            <MenuLink key={href} href={href} onNavigate={onNavigate}>
              {label}
            </MenuLink>
          ))}
        </MenuColumn>
        <MenuColumn title="Ajuda" className="col-span-2">
          {HELP_LINKS.map(([href, label]) => (
            <MenuLink key={href} href={href} onNavigate={onNavigate}>
              {label}
            </MenuLink>
          ))}
        </MenuColumn>
        <Link href={base} onClick={onNavigate} className="group relative col-span-4 flex min-h-56 flex-col justify-end overflow-hidden bg-ink p-6 text-white">
          {category.imageUrl ? (
            <Image src={category.imageUrl} alt="" fill sizes="33vw" className="object-cover opacity-70 transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="absolute -right-6 top-4 w-72 opacity-40 transition-transform duration-700 group-hover:scale-105">
              <GlassesArt tone="light" />
            </div>
          )}
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">Coleção</p>
            <p className="mt-1 text-2xl font-semibold">{category.name}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 group-hover:underline">
              Comprar agora <ArrowRight className="size-4" aria-hidden />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function MenuColumn({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function MenuLink({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} onClick={onNavigate} className="text-[15px] text-ink underline-offset-4 hover:underline">
        {children}
      </Link>
    </li>
  );
}
