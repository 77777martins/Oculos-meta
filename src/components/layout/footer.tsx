import Link from "next/link";
import { CreditCard, Lock, QrCode, Truck } from "lucide-react";
import { getStoreSettings } from "@/server/services/settings";
import { Logo } from "./logo";

export async function Footer() {
  const s = await getStoreSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-ink text-slate-300">
      <div className="border-b border-white/10">
        <div className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {[
            { icon: QrCode, title: "PIX instantâneo", text: "Aprovação em segundos" },
            { icon: CreditCard, title: "Cartão de crédito", text: `Em até ${s.maxInstallments}x pelo Mercado Pago` },
            { icon: Truck, title: "Entrega rastreada", text: "Acompanhe cada etapa" },
            { icon: Lock, title: "Compra segura", text: "Dados protegidos" },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-brand-300">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo inverted name={s.storeName} />
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">Óculos inteligentes com curadoria, procedência e atendimento especializado.</p>
          {s.instagramUrl && (
            <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-brand-300 hover:text-white">
              Instagram
            </a>
          )}
        </div>
        <FooterCol
          title="Loja"
          links={[
            ["/produtos", "Todos os modelos"],
            ["/busca", "Buscar"],
            ["/carrinho", "Carrinho"],
            ["/conta/favoritos", "Favoritos"],
          ]}
        />
        <FooterCol
          title="Ajuda"
          links={[
            ["/faq", "Perguntas frequentes"],
            ["/contato", "Fale conosco"],
            ["/conta/pedidos", "Rastrear pedido"],
            ["/trocas-e-devolucoes", "Trocas e devoluções"],
          ]}
        />
        <FooterCol
          title="Institucional"
          links={[
            ["/sobre", "Sobre nós"],
            ["/politica-de-privacidade", "Privacidade"],
            ["/termos-de-uso", "Termos de uso"],
          ]}
        />
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-white">Atendimento</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            {s.contactEmail && <li>{s.contactEmail}</li>}
            {s.contactPhone && <li>{s.contactPhone}</li>}
            {s.businessHours && <li>{s.businessHours}</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {s.legalName ?? s.storeName}
            {s.cnpj ? ` — CNPJ ${s.cnpj}` : ""}. Todos os direitos reservados.
          </p>
          <p>Ray-Ban® e Meta® são marcas de seus respectivos titulares. Loja independente.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="md:col-span-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-slate-400 transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
