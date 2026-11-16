import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Hero, type HeroSlide } from "@/components/store/home/hero";
import { ProductRail } from "@/components/store/home/product-rail";
import { AccountCard, CollectionCard, ServicesPanel } from "@/components/store/home/sections";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveBanners, getActiveCategories, getFeaturedProducts, listProducts } from "@/server/services/catalog";
import { getStoreSettings } from "@/server/services/settings";

/** Banner usado só enquanto o administrador não cadastra nenhum em Admin > Banners. */
const FALLBACK_SLIDE: HeroSlide = {
  id: "padrao",
  title: "Veja o mundo de um jeito novo.",
  subtitle: "Óculos inteligentes com câmera, áudio aberto e assistente de voz.",
  imageUrl: "/images/banners/hero-visio-wide.webp",
  linkUrl: "/produtos",
  ctaLabel: "Explorar modelos",
};

/** Abaixo disso, uma segunda faixa ("Novidades") repetiria os mesmos produtos dos destaques. */
const MIN_PRODUCTS_FOR_SECOND_RAIL = 8;

export default async function HomePage() {
  const [featured, categories, banners, settings, user] = await Promise.all([
    getFeaturedProducts(24),
    getActiveCategories(),
    getActiveBanners(),
    getStoreSettings(),
    getCurrentUser(),
  ]);
  const newest = featured.length >= MIN_PRODUCTS_FOR_SECOND_RAIL ? (await listProducts({ ordem: "novidades", page: 1 })).items : [];

  const slides: HeroSlide[] =
    banners.length > 0 ? banners.map(({ id, title, subtitle, imageUrl, linkUrl, ctaLabel }) => ({ id, title, subtitle, imageUrl, linkUrl, ctaLabel })) : [FALLBACK_SLIDE];
  const firstName = user ? (user.name.split(" ")[0] ?? user.name) : null;

  return (
    // `page-gray` pinta o <main> de cinza (ver layout da loja), como fundo dos cartões brancos.
    <div className="page-gray">
      <Hero slides={slides} />
      <div className="relative z-10 mx-auto -mt-16 max-w-[1500px] space-y-5 px-3 sm:-mt-28 sm:px-5 lg:-mt-[220px]">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 3).map((c) => (
            <CollectionCard key={c.id} name={c.name} slug={c.slug} products={featured.filter((p) => p.categorySlug === c.slug)} />
          ))}
          <AccountCard firstName={firstName} />
        </div>

        {featured.length > 0 ? (
          <ProductRail title="Destaques da loja" products={featured} viewAllHref="/produtos" />
        ) : (
          <div className="bg-white p-5">
            <EmptyState title="Catálogo em preparação" description="Nossos modelos estão sendo cadastrados. Volte em breve!" icon={<Sparkles className="size-6" />} />
          </div>
        )}
        {newest.length > 0 && <ProductRail title="Novidades" products={newest} viewAllHref="/produtos?ordem=novidades" />}
        <ServicesPanel maxInstallments={settings.maxInstallments} />
      </div>
    </div>
  );
}
