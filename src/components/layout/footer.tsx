import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getStoreSettings } from "@/server/services/settings";
import { getNavigation } from "@/server/services/navigation";
import { Logo } from "./logo";

type FooterLink = [href: string, label: string];

export async function Footer() {
  const [s, navigation] = await Promise.all([getStoreSettings(), getNavigation()]);
  const year = new Date().getFullYear();

  const columns: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: "Comprar",
      links: [...navigation.map((c): FooterLink => [`/categorias/${c.slug}`, c.name]), ["/produtos", "Todos os modelos"], ["/conta/favoritos", "Favoritos"]],
    },
    {
      title: "Ajuda",
      links: [
        ["/faq", "Perguntas frequentes"],
        ["/conta/pedidos", "Rastrear pedido"],
        ["/trocas-e-devolucoes", "Trocas e devoluções"],
        ["/contato", "Fale conosco"],
      ],
    },
    {
      title: "Sobre",
      links: [
        ["/sobre", "Quem somos"],
        ["/creditos-imagens", "Créditos das imagens"],
      ],
    },
    {
      title: "Legal",
      links: [
        ["/politica-de-privacidade", "Política de privacidade"],
        ["/termos-de-uso", "Termos de uso"],
      ],
    },
  ];

  const payments = ["PIX", "Cartão de crédito", ...(s.boletoEnabled ? ["Boleto"] : [])];
  const contact = [s.contactEmail, s.contactPhone, s.businessHours].filter((v): v is string => !!v);

  return (
    <footer className="mt-24 border-t border-slate-200 bg-slate-50 text-ink">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo name={s.storeName} />
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-600">Óculos inteligentes com curadoria, procedência e atendimento especializado.</p>
          {contact.length > 0 && (
            <ul className="mt-5 space-y-1 text-sm text-slate-600">
              {contact.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {s.instagramUrl && (
            <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
              Instagram
            </a>
          )}
        </div>

        {/* Desktop: colunas abertas. Celular: sanfonas nativas (<details>), sem JavaScript. */}
        <div className="grid gap-x-8 lg:col-span-8 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <details className="group border-b border-slate-200 lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-xs font-semibold uppercase tracking-[0.2em] [&::-webkit-details-marker]:hidden">
                  {col.title}
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <FooterLinks links={col.links} className="pb-4" />
              </details>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">{col.title}</p>
                <FooterLinks links={col.links} className="mt-5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="container-page flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" aria-label="Formas de pagamento">
            {payments.map((p) => (
              <span key={p} className="border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                {p}
              </span>
            ))}
            <span className="text-xs text-slate-500">via Mercado Pago</span>
          </div>
          <div className="space-y-1 text-xs text-slate-500 lg:text-right">
            <p>
              © {year} {s.legalName ?? s.storeName}
              {s.cnpj ? ` — CNPJ ${s.cnpj}` : ""}. Todos os direitos reservados.
            </p>
            <p>Ray-Ban®, Oakley® e Meta® são marcas de seus respectivos titulares. Loja independente, sem vínculo com os fabricantes.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ links, className }: { links: FooterLink[]; className?: string }) {
  return (
    <ul className={`space-y-2.5 text-sm ${className ?? ""}`}>
      {links.map(([href, label]) => (
        <li key={href}>
          <Link href={href} className="text-slate-600 underline-offset-4 transition-colors hover:text-ink hover:underline">
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
