import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Hero, type HeroSlide } from "@/components/store/home/hero";
import { ProductRail } from "@/components/store/home/product-rail";
import { CollectionTiles, EditorialSplit, ServicesStrip } from "@/components/store/home/sections";
import { getActiveBanners, getActiveCategories, getFeaturedProducts } from "@/server/services/catalog";
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

export default async function HomePage() {
  const [products, categories, banners, settings] = await Promise.all([getFeaturedProducts(12), getActiveCategories(), getActiveBanners(), getStoreSettings()]);
  const slides: HeroSlide[] = banners.length > 0 ? banners.map(({ id, title, subtitle, imageUrl, linkUrl, ctaLabel }) => ({ id, title, subtitle, imageUrl, linkUrl, ctaLabel })) : [FALLBACK_SLIDE];

  return (
    <>
      <Hero slides={slides} />
      <CollectionTiles categories={categories} />
      {products.length > 0 ? (
        <ProductRail title="Destaques" products={products} viewAllHref="/produtos" />
      ) : (
        <div className="container-page py-16">
          <EmptyState title="Catálogo em preparação" description="Nossos modelos estão sendo cadastrados. Volte em breve!" icon={<Sparkles className="size-6" />} />
        </div>
      )}
      <EditorialSplit />
      <ServicesStrip maxInstallments={settings.maxInstallments} />
    </>
  );
}
