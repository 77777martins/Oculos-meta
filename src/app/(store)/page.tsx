import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, Headphones, Mic, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { GlassesArt } from "@/components/ui/glasses-art";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductGrid } from "@/components/store/product-card";
import { getActiveBanners, getActiveCategories, getFeaturedProducts } from "@/server/services/catalog";
import { getStoreSettings } from "@/server/services/settings";

export default async function HomePage() {
  const [products, categories, banners, settings] = await Promise.all([getFeaturedProducts(8), getActiveCategories(), getActiveBanners(), getStoreSettings()]);
  const banner = banners[0];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-brand-950 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_80%_20%,rgb(59_102_245/0.45),transparent_60%),radial-gradient(50%_60%_at_10%_90%,rgb(37_71_234/0.35),transparent_60%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="container-page grid items-center gap-8 py-10 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-brand-100 backdrop-blur">
              <Sparkles className="size-3.5" aria-hidden /> Tecnologia que você veste
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              {banner?.title ?? (
                <>
                  O futuro está <span className="text-gradient">diante dos seus olhos.</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              {banner?.subtitle ?? "Óculos inteligentes com câmera, áudio aberto e assistente de voz. Estilo icônico, compra segura e entrega rastreada para todo o Brasil."}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href={banner?.linkUrl ?? "/produtos"} size="lg">
                {banner?.ctaLabel ?? "Explorar modelos"} <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/sobre" size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10">
                Por que comprar aqui
              </ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                ["PIX", "aprovação imediata"],
                [`${settings.maxInstallments}x`, "no cartão"],
                ["100%", "rastreado"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-display text-2xl font-semibold text-white">{k}</dt>
                  <dd className="mt-1 text-xs text-slate-400">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {/* No celular a arte vem primeiro (visível sem rolar); no desktop fica à direita. */}
          <div className="relative order-first mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms] lg:order-none lg:max-w-xl">
            <div className="absolute inset-8 -z-10 rounded-full bg-brand-500/30 blur-3xl" />
            {banner?.imageUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] ring-1 ring-white/10">
                <Image src={banner.imageUrl} alt={banner.title} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 backdrop-blur">
                <GlassesArt tone="light" className="drop-shadow-[0_30px_40px_rgb(0_0_0/0.45)]" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section className="container-page py-20" aria-labelledby="recursos">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Por que óculos inteligentes</p>
          <h2 id="recursos" className="mt-3 text-3xl font-semibold sm:text-4xl">
            Mãos livres para viver o momento.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Camera, title: "Registre sem pegar o celular", text: "Fotos e vídeos do seu ponto de vista, direto dos óculos." },
            { icon: Headphones, title: "Áudio aberto", text: "Música, chamadas e podcasts sem tampar os ouvidos." },
            { icon: Mic, title: "Comandos de voz", text: "Peça ajuda ao assistente sem tirar as mãos do que importa." },
            { icon: ShieldCheck, title: "Compra transparente", text: "Preço, prazo e status do pedido sempre visíveis na sua conta." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="group rounded-3xl border border-slate-100 bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lift">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">Recursos variam conforme o modelo. Consulte as especificações de cada produto.</p>
      </section>

      {/* DESTAQUES */}
      <section className="container-page" aria-labelledby="destaques">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Coleção</p>
            <h2 id="destaques" className="mt-3 text-3xl font-semibold sm:text-4xl">
              Modelos em destaque
            </h2>
          </div>
          <Link href="/produtos" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:gap-2 sm:inline-flex">
            Ver todos <ArrowRight className="size-4 transition-all" aria-hidden />
          </Link>
        </div>
        <div className="mt-10">
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <EmptyState title="Catálogo em preparação" description="Nossos modelos estão sendo cadastrados. Volte em breve!" icon={<Sparkles className="size-6" />} />
          )}
        </div>
      </section>

      {/* CATEGORIAS */}
      {categories.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="categorias">
          <h2 id="categorias" className="text-3xl font-semibold sm:text-4xl">
            Encontre o seu estilo
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.slice(0, 6).map((c, i) => (
              <Link
                key={c.id}
                href={`/categorias/${c.slug}`}
                className="group relative flex min-h-48 flex-col justify-end overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 to-ink p-7 text-white"
              >
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt="" fill sizes="33vw" className="object-cover opacity-50 transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute -right-10 -top-6 w-64 opacity-25 transition-transform duration-700 group-hover:scale-110" style={{ transform: `rotate(${(i % 3) * 6 - 6}deg)` }}>
                    <GlassesArt tone="light" />
                  </div>
                )}
                <div className="relative">
                  <h3 className="text-xl font-semibold">{c.name}</h3>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-slate-300">{c.description}</p>}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-200 group-hover:gap-2">
                    Ver modelos <ArrowRight className="size-4 transition-all" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CONFIANÇA */}
      <section className="container-page mt-24">
        <div className="grid gap-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-50 via-white to-slate-50 p-8 ring-1 ring-brand-100 sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold">Compra segura do início ao fim</h2>
            <p className="mt-4 text-slate-600">
              Pagamentos processados pelo Mercado Pago, com confirmação automática. Seus dados de cartão nunca passam pelos nossos servidores e cada pedido é rastreado até a sua porta.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/faq" variant="dark">
                Dúvidas frequentes
              </ButtonLink>
              <ButtonLink href="/trocas-e-devolucoes" variant="outline">
                Trocas e devoluções
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [ShieldCheck, "Pagamento protegido", "Confirmação validada diretamente com o Mercado Pago."],
              [Truck, "Entrega rastreável", "Código de rastreio e histórico na sua conta."],
              [Sparkles, "Descrição fiel", "Estado e especificações informados em cada produto."],
              [Headphones, "Atendimento humano", "Suporte antes e depois da compra."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={title as string} className="rounded-2xl bg-white p-5 shadow-soft">
                  <I className="size-5 text-brand-600" aria-hidden />
                  <p className="mt-3 text-sm font-semibold">{title as string}</p>
                  <p className="mt-1 text-sm text-slate-600">{text as string}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
