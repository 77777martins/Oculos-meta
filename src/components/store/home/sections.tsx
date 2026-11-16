import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, CreditCard, Headphones, Mic, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { GlassesArt } from "@/components/ui/glasses-art";

interface TileCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

/** Blocos grandes de coleção, lado a lado (o primeiro ocupa mais espaço quando há 3). */
export function CollectionTiles({ categories }: { categories: TileCategory[] }) {
  if (categories.length === 0) return null;
  const items = categories.slice(0, 3);
  return (
    <section className="container-page pt-16 sm:pt-20" aria-labelledby="colecoes-titulo">
      <h2 id="colecoes-titulo" className="text-2xl font-semibold uppercase tracking-[0.08em] sm:text-3xl">
        Compre por coleção
      </h2>
      <div className={`mt-8 grid gap-4 sm:gap-6 ${items.length >= 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {items.map((c, i) => (
          <Link key={c.id} href={`/categorias/${c.slug}`} className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden bg-ink p-6 text-white sm:aspect-[16/10] lg:aspect-[4/5]">
            {c.imageUrl ? (
              <Image src={c.imageUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_30%,rgb(37_71_234/0.45),transparent_70%)]">
                <div className="absolute left-1/2 top-[38%] w-[78%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-700 group-hover:scale-105" style={{ rotate: `${(i % 3) * 4 - 4}deg` }}>
                  <GlassesArt tone="light" />
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />
            <div className="relative">
              <h3 className="text-2xl font-semibold">{c.name}</h3>
              {c.description && <p className="mt-1 line-clamp-2 max-w-sm text-sm text-white/75">{c.description}</p>}
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.12em] underline-offset-4 group-hover:underline">
                Comprar agora <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Bloco editorial dividido: arte de um lado, texto e recursos do outro. */
export function EditorialSplit() {
  const features = [
    { icon: Camera, title: "Registre sem pegar o celular", text: "Fotos e vídeos do seu ponto de vista." },
    { icon: Headphones, title: "Áudio aberto", text: "Música e chamadas sem tampar os ouvidos." },
    { icon: Mic, title: "Comandos de voz", text: "Peça ajuda ao assistente com as mãos livres." },
  ];
  return (
    <section className="bg-slate-50" aria-labelledby="editorial-titulo">
      <div className="container-page grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-ink">
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgb(37_71_234/0.5),transparent_70%)]" />
          <GlassesArt tone="light" className="relative w-3/4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tecnologia que você veste</p>
          <h2 id="editorial-titulo" className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Mãos livres para viver o momento.
          </h2>
          <ul className="mt-8 space-y-6">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-slate-500">Recursos variam conforme o modelo. Consulte as especificações de cada produto.</p>
          <Link href="/produtos" className="mt-8 inline-flex h-12 items-center bg-ink px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-slate-800">
            Descobrir modelos
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Faixa de serviços: só compromissos que a loja realmente cumpre. */
export function ServicesStrip({ maxInstallments }: { maxInstallments: number }) {
  const items = [
    { icon: Truck, title: "Entrega rastreada", text: "Acompanhe cada etapa na sua conta.", href: "/faq" },
    { icon: CreditCard, title: `Até ${maxInstallments}x no cartão`, text: "Ou PIX com aprovação imediata.", href: "/faq" },
    { icon: RotateCcw, title: "7 dias para desistir", text: "Direito de arrependimento garantido.", href: "/trocas-e-devolucoes" },
    { icon: ShieldCheck, title: "Compra segura", text: "Pagamento processado pelo Mercado Pago.", href: "/faq" },
  ];
  return (
    <section className="border-y border-slate-200" aria-label="Serviços da loja">
      <ul className="container-page grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text, href }) => (
          <li key={title}>
            <Link href={href} className="group flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
              <Icon className="size-6 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold underline-offset-4 group-hover:underline">{title}</p>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">{text}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
