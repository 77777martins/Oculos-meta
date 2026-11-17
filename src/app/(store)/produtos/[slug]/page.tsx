import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { effectivePriceCents } from "@/lib/money";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductRail } from "@/components/store/home/product-rail";
import { getProductBySlug, getRelatedProducts } from "@/server/services/catalog";
import { getProductReviews, getReviewEligibility } from "@/server/services/reviews";
import { getStoreSettings } from "@/server/services/settings";
import { ProductReviews } from "@/components/store/product-reviews";
import { RichDescription } from "@/components/store/rich-description";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Produto não encontrado" };
  const title = product.seoTitle ?? product.name;
  const description = product.seoDescription ?? product.shortDescription ?? product.description.slice(0, 155);
  const image = product.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: { title, description, type: "website", images: image ? [{ url: image, alt: product.images[0]!.alt }] : undefined },
  };
}

/** Serializa JSON-LD com escape de "<" — impede fechar a tag <script> (XSS). */
function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [user, settings, related] = await Promise.all([getCurrentUser(), getStoreSettings(), getRelatedProducts(product.id, product.categoryId, 8)]);
  const [reviews, eligibility] = await Promise.all([getProductReviews(product.id), getReviewEligibility(user?.id ?? null, product.id)]);
  const isFavorite = user ? (await db.favorite.count({ where: { userId: user.id, productId: product.id } })) > 0 : false;
  const prices = product.variants.map((v) => effectivePriceCents(v));
  const appUrl = process.env.APP_URL ?? "";

  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    model: product.model,
    description: product.shortDescription ?? product.description.slice(0, 300),
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku,
    // Só declara nota ao Google quando há avaliações reais publicadas.
    ...(reviews.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.average, reviewCount: reviews.count } } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.available > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${appUrl}/produtos/${product.slug}`,
    },
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <nav aria-label="Trilha de navegação" className="mb-8 flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link href="/" className="hover:text-ink">
          Início
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <Link href="/produtos" className="hover:text-ink">
          Produtos
        </Link>
        {product.category && (
          <>
            <ChevronRight className="size-4" aria-hidden />
            <Link href={`/categorias/${product.category.slug}`} className="hover:text-ink">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-4" aria-hidden />
        <span aria-current="page" className="text-ink">
          {product.name}
        </span>
      </nav>

      <ProductPurchase
        product={{ id: product.id, name: product.name, brand: product.brand, model: product.model, shortDescription: product.shortDescription }}
        variants={product.variants}
        images={product.images}
        maxInstallments={settings.maxInstallments}
        isFavorite={isFavorite}
        isLoggedIn={Boolean(user)}
      />

      <div className="mt-20 grid grid-cols-1 gap-12 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-labelledby="descricao">
          <h2 id="descricao" className="text-2xl font-semibold">
            Descrição
          </h2>
          {/* Texto puro estruturado (subtítulos e listas); o React escapa o conteúdo — sem risco de XSS. */}
          <RichDescription text={product.description} />
        </section>
        <section className="lg:col-span-2" aria-labelledby="especificacoes">
          <h2 id="especificacoes" className="text-2xl font-semibold">
            Especificações técnicas
          </h2>
          {product.specs.length > 0 ? (
            <dl className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
              {product.specs.map((s, i) => (
                <div key={`${s.label}-${i}`} className="grid grid-cols-5 gap-4 px-5 py-3.5 text-sm odd:bg-surface">
                  <dt className="col-span-2 font-medium text-slate-600">{s.label}</dt>
                  <dd className="col-span-3 text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Especificações em atualização. Fale com nosso atendimento para mais detalhes.</p>
          )}
        </section>
      </div>

      <ProductReviews productId={product.id} slug={product.slug} reviews={reviews} eligibility={eligibility} />

      {related.length > 0 && (
        <div className="mt-20 border-t border-slate-100 pt-4">
          <ProductRail title="Você também pode gostar" products={related} viewAllHref={product.category ? `/categorias/${product.category.slug}` : "/produtos"} />
        </div>
      )}
    </div>
  );
}
