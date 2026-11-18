import Link from "next/link";
import { getStoreSettings } from "@/server/services/settings";
import { getNavigation } from "@/server/services/navigation";
import { Logo } from "./logo";
import { HELP_LINKS, type NavLink } from "./nav-links";

export async function Footer() {
  const [s, navigation] = await Promise.all([getStoreSettings(), getNavigation()]);
  const year = new Date().getFullYear();

  const columns: Array<{ title: string; links: NavLink[] }> = [
    {
      title: "Conheça a loja",
      links: [
        ["/sobre", "Quem somos"],
        ["/creditos-imagens", "Créditos das imagens"],
        ["/politica-de-privacidade", "Política de privacidade"],
        ["/termos-de-uso", "Termos de uso"],
      ],
    },
    {
      title: "Compre com a gente",
      links: [...navigation.map((c): NavLink => [`/categorias/${c.slug}`, c.name]), ["/produtos", "Todos os modelos"], ["/produtos?ordem=novidades", "Novidades"]],
    },
    {
      title: "Sua conta",
      links: [
        ["/conta", "Minha conta"],
        ["/conta/pedidos", "Meus pedidos"],
        ["/conta/favoritos", "Favoritos"],
        ["/conta/privacidade", "Privacidade e dados"],
      ],
    },
    { title: "Ajuda", links: HELP_LINKS },
  ];

  const payments = ["PIX", "Cartão de crédito", ...(s.boletoEnabled ? ["Boleto"] : [])];
  const contact = [s.contactEmail, s.contactPhone, s.businessHours].filter((v): v is string => !!v);

  return (
    <footer className="text-white">
      {/* Âncora nativa: funciona sem JavaScript e respeita "reduzir movimento". */}
      <a href="#topo" className="block bg-[#26314f] py-4 text-center text-sm font-medium hover:bg-[#2f3b5c]">
        Voltar ao início
      </a>

      <div className="bg-ink-soft">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-8 gap-y-10 px-6 py-12 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-bold">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-white/75 hover:text-white hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 bg-ink-soft">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-6 py-8 text-center">
          <Logo name={s.storeName} inverted />
          <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Formas de pagamento">
            {payments.map((p) => (
              <span key={p} className="rounded border border-white/25 px-2.5 py-1 text-xs text-white/85">
                {p}
              </span>
            ))}
            <span className="text-xs text-white/60">via Mercado Pago</span>
          </div>
          {contact.length > 0 && <p className="text-sm text-white/70">{contact.join(" · ")}</p>}
          {s.instagramUrl && (
            <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-white hover:underline">
              Instagram
            </a>
          )}
        </div>
      </div>

      <div className="bg-ink">
        <div className="mx-auto max-w-5xl space-y-1 px-6 py-6 text-center text-xs text-white/60">
          <p>
            © {year} {s.legalName ?? s.storeName}
            {s.cnpj ? ` — CNPJ ${s.cnpj}` : ""}. Todos os direitos reservados.
          </p>
          <p>Ray-Ban®, Oakley® e Meta® são marcas de seus respectivos titulares. Loja independente, sem vínculo com os fabricantes.</p>
        </div>
      </div>
    </footer>
  );
}
