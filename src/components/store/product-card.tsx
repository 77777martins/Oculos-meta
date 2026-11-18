import Link from "next/link";
import Image from "next/image";
import type { ProductCardData } from "@/server/services/catalog";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { GlassesArt } from "@/components/ui/glasses-art";
import { LensPhoto, isBundledImage } from "@/components/ui/lens-photo";
import { cn } from "@/lib/utils";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  return (
    <article className="group relative">
      <Link href={`/produtos/${product.slug}`} className="block" aria-label={`${product.name} — ver detalhes`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-slate-50 transition-colors duration-500 group-hover:bg-slate-100">
          {product.image ? (
            <>
<LensPhoto src={product.image.url} sunSrc={product.image.sunUrl} alt={product.image.alt} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={priority} className={cn("p-4 transition-all duration-500", product.hoverImage && !product.image.sunUrl ? "group-hover:opacity-0" : "group-hover:scale-[1.04]")} />
              {product.hoverImage && !product.image.sunUrl && (
                <Image src={product.hoverImage.url} alt="" fill sizes="25vw" unoptimized={isBundledImage(product.hoverImage.url)} className="object-contain p-4 opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 transition-transform duration-700 group-hover:scale-105">
              <GlassesArt />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {!product.inStock && <Badge tone="dark">Esgotado</Badge>}
            {product.inStock && product.listPriceCents > product.priceCents && <Badge tone="success">Oferta</Badge>}
          </div>
        </div>
        <div className="mt-4 space-y-1 px-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{product.brand}</p>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink underline-offset-4 group-hover:underline">{product.name}</h3>
          {product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1" aria-label={`${product.colors.length} cores disponíveis`}>
              {product.colors.map((c, i) => (
                <span key={`${c.hex}-${i}`} title={c.name ?? undefined} className="size-3.5 rounded-full ring-1 ring-slate-300 ring-offset-1" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
          )}
          <Price cents={product.priceCents} listCents={product.listPriceCents} size="sm" className="pt-1" />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
