import Link from "next/link";
import { CreditCard, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { GlassesArt } from "@/components/ui/glasses-art";
import { LensPhoto } from "@/components/ui/lens-photo";
import { formatBRL } from "@/lib/money";
import type { ProductCardData } from "@/server/services/catalog";

/** Cartão branco da home: título, conteúdo e link de rodapé. */
function HomeCard({ title, footer, children }: { title: string; footer?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-white p-5">
      <h2 className="text-xl font-bold leading-tight">{title}</h2>
      <div className="mt-3 flex-1">{children}</div>
      {footer && (
        <Link href={footer.href} className="mt-4 text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline">
          {footer.label}
        </Link>
      )}
    </div>
  );
}

function Thumb({ product }: { product: ProductCardData | null }) {
  return (
    <div className="relative aspect-square bg-slate-50">
      {product?.image ? (
        <LensPhoto src={product.image.url} sunSrc={product.image.sunUrl} alt="" sizes="(max-width: 640px) 45vw, 160px" className="p-2" />
      ) : (
        <div className="flex h-full items-center justify-center p-3">
          <GlassesArt />
        </div>
      )}
    </div>
  );
}

/**
 * Cartão de coleção em grade 2×2 com os modelos da coleção. Sem produtos suficientes,
 * mostra um único bloco com a ilustração (não repete o mesmo produto para preencher).
 */
export function CollectionCard({ name, slug, products }: { name: string; slug: string; products: ProductCardData[] }) {
  const items = products.slice(0, 4);
  return (
    <HomeCard title={name} footer={{ href: `/categorias/${slug}`, label: items.length > 0 ? "Ver todos" : "Conhecer a coleção" }}>
      {items.length >= 2 ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/produtos/${p.slug}`} className="group block">
                <Thumb product={p} />
                <p className="mt-1 line-clamp-1 text-xs text-slate-700 group-hover:text-brand-700">{p.model}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Link href={items[0] ? `/produtos/${items[0].slug}` : `/categorias/${slug}`} className="group block">
          <div className="relative aspect-[4/3.6] bg-slate-50">
            {items[0]?.image ? (
              <LensPhoto src={items[0].image.url} sunSrc={items[0].image.sunUrl} alt="" sizes="(max-width: 640px) 90vw, 330px" className="p-4" />
            ) : (
              <div className="flex h-full items-center justify-center bg-ink p-8">
                <GlassesArt tone="light" />
              </div>
            )}
          </div>
          {items[0] && (
            <p className="mt-2 text-sm text-slate-700 group-hover:text-brand-700">
              {items[0].name} · <strong>{formatBRL(items[0].priceCents)}</strong>
            </p>
          )}
        </Link>
      )}
    </HomeCard>
  );
}

/** Cartão de conta: convite para entrar ou atalhos para quem já está logado. */
export function AccountCard({ firstName }: { firstName: string | null }) {
  if (!firstName) {
    return (
      <HomeCard title="Entre e aproveite a loja">
        <p className="text-sm text-slate-600">Acompanhe seus pedidos, salve favoritos e compre mais rápido.</p>
        <Link href="/entrar" className="mt-5 flex h-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">
          Fazer login
        </Link>
        <Link href="/cadastro" className="mt-3 block text-center text-sm text-brand-700 hover:underline">
          Novo cliente? Criar conta
        </Link>
      </HomeCard>
    );
  }
  const links: Array<[string, string]> = [
    ["/conta/pedidos", "Seus pedidos"],
    ["/conta/favoritos", "Seus favoritos"],
    ["/conta/enderecos", "Seus endereços"],
    ["/conta", "Dados da conta"],
  ];
  return (
    <HomeCard title={`Olá, ${firstName}`}>
      <ul className="grid grid-cols-2 gap-3">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="flex h-20 items-center justify-center bg-slate-50 p-2 text-center text-sm font-medium hover:bg-slate-100 hover:text-brand-700">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}

/** Faixa de serviços: só compromissos que a loja realmente cumpre. */
export function ServicesPanel({ maxInstallments }: { maxInstallments: number }) {
  const items = [
    { icon: Truck, title: "Entrega rastreada", text: "Acompanhe cada etapa na sua conta.", href: "/faq" },
    { icon: CreditCard, title: `Até ${maxInstallments}x no cartão`, text: "Ou PIX com aprovação imediata.", href: "/faq" },
    { icon: RotateCcw, title: "7 dias para desistir", text: "Direito de arrependimento garantido.", href: "/trocas-e-devolucoes" },
    { icon: ShieldCheck, title: "Compra segura", text: "Pagamento processado pelo Mercado Pago.", href: "/faq" },
  ];
  return (
    <section className="bg-white p-5" aria-label="Serviços da loja">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text, href }) => (
          <li key={title}>
            <Link href={href} className="group flex items-start gap-3">
              <Icon className="mt-0.5 size-6 shrink-0 text-brand-700" aria-hidden />
              <div>
                <p className="text-sm font-bold group-hover:text-brand-700 group-hover:underline">{title}</p>
                <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{text}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
