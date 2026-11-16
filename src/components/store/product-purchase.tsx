"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { GlassesArt } from "@/components/ui/glasses-art";
import { cart } from "@/components/providers/cart-store";
import { useToast } from "@/components/providers/toast";
import { effectivePriceCents, formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { MAX_QTY_PER_ITEM } from "@/lib/validation/checkout";
import { FavoriteButton } from "./favorite-button";

interface Variant {
  id: string;
  sku: string;
  name: string;
  color: string | null;
  colorHex: string | null;
  lens: string | null;
  size: string | null;
  priceCents: number;
  salePriceCents: number | null;
  available: number;
}

interface Props {
  product: { id: string; name: string; brand: string; model: string; shortDescription: string | null };
  variants: Variant[];
  images: Array<{ id: string; url: string; alt: string; variantId: string | null }>;
  maxInstallments: number;
  isFavorite: boolean;
  isLoggedIn: boolean;
}

export function ProductPurchase({ product, variants, images, maxInstallments, isFavorite, isLoggedIn }: Props) {
  const toast = useToast();
  const [variantId, setVariantId] = useState(() => (variants.find((v) => v.available > 0) ?? variants[0])?.id);
  const [qty, setQty] = useState(1);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];

  const gallery = useMemo(() => {
    const specific = images.filter((i) => i.variantId === variantId);
    return specific.length > 0 ? [...specific, ...images.filter((i) => !i.variantId)] : images;
  }, [images, variantId]);
  const [activeImage, setActiveImage] = useState(0);
  const current = gallery[Math.min(activeImage, gallery.length - 1)];

  if (!variant) return null;
  const price = effectivePriceCents(variant);
  const soldOut = variant.available <= 0;
  const maxQty = Math.min(MAX_QTY_PER_ITEM, variant.available);
  const installments = Math.max(1, Math.min(maxInstallments, Math.floor(price / 5000)));

  function addToCart() {
    if (!variant || soldOut) return;
    const ok = cart.add(variant.id, qty);
    if (!ok) {
      toast.error("Carrinho cheio", "Remova itens antes de adicionar novos produtos.");
      return;
    }
    toast.success("Adicionado ao carrinho", `${product.name} — ${variant.name}`, { label: "Ver carrinho", href: "/carrinho" });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Galeria */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-brand-50 ring-1 ring-slate-100">
          {current ? (
            <Image key={current.id} src={current.url} alt={current.alt} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="animate-fade-up object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-12">
              <GlassesArt />
            </div>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Imagens do produto">
            {gallery.map((img, i) => (
              <button
                key={img.id}
                type="button"
                role="tab"
                aria-selected={i === activeImage}
                aria-label={`Imagem ${i + 1}`}
                onClick={() => setActiveImage(i)}
                className={cn("relative size-20 shrink-0 overflow-hidden rounded-2xl ring-2 transition-all", i === activeImage ? "ring-brand-600" : "ring-transparent opacity-70 hover:opacity-100")}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compra */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{product.brand}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Modelo {product.model} · SKU {variant.sku}
            </p>
          </div>
          <FavoriteButton productId={product.id} initial={isFavorite} isLoggedIn={isLoggedIn} />
        </div>

        <div className="mt-6">
          <Price cents={price} listCents={variant.priceCents} size="lg" />
          <p className="mt-1 text-sm text-slate-600">
            ou até {installments}x de {formatBRL(Math.ceil(price / installments))} no cartão* · PIX com aprovação imediata
          </p>
        </div>

        {product.shortDescription && <p className="mt-6 leading-7 text-slate-700">{product.shortDescription}</p>}

        {variants.length > 1 && (
          <fieldset className="mt-8">
            <legend className="text-sm font-semibold">
              Variante: <span className="font-normal text-slate-600">{variant.name}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVariantId(v.id);
                    setActiveImage(0);
                    setQty(1);
                  }}
                  aria-pressed={v.id === variant.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                    v.id === variant.id ? "border-brand-600 bg-brand-50 font-semibold text-brand-800 ring-2 ring-brand-600/20" : "border-slate-200 hover:border-slate-400",
                    v.available <= 0 && "text-slate-400 line-through decoration-slate-300",
                  )}
                >
                  {v.colorHex && <span className="size-4 rounded-full ring-1 ring-slate-300" style={{ backgroundColor: v.colorHex }} aria-hidden />}
                  {v.name}
                </button>
              ))}
            </div>
            {(variant.lens || variant.size) && (
              <p className="mt-3 text-sm text-slate-600">
                {variant.lens && <>Lentes: {variant.lens}</>}
                {variant.lens && variant.size && " · "}
                {variant.size && <>Tamanho: {variant.size}</>}
              </p>
            )}
          </fieldset>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex h-13 items-center rounded-full border border-slate-200" role="group" aria-label="Quantidade">
            <button type="button" className="flex size-12 items-center justify-center rounded-full text-slate-700 hover:bg-slate-50 disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || soldOut} aria-label="Diminuir quantidade">
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-semibold" aria-live="polite">
              {qty}
            </span>
            <button type="button" className="flex size-12 items-center justify-center rounded-full text-slate-700 hover:bg-slate-50 disabled:opacity-40" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty || soldOut} aria-label="Aumentar quantidade">
              <Plus className="size-4" />
            </button>
          </div>
          <Button size="lg" className="flex-1" onClick={addToCart} disabled={soldOut} icon={<ShoppingBag className="size-5" />}>
            {soldOut ? "Esgotado" : "Adicionar ao carrinho"}
          </Button>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            {soldOut ? (
              <span className="text-red-600">Variante indisponível no momento.</span>
            ) : (
              <>
                <Check className="size-4 text-emerald-600" aria-hidden />
                {variant.available <= 5 ? `Últimas ${variant.available} unidades em estoque` : "Em estoque, pronto para envio"}
              </>
            )}
          </li>
          <li className="flex items-center gap-2">
            <Truck className="size-4 text-brand-600" aria-hidden /> Calcule o frete no carrinho
          </li>
        </ul>
        <p className="mt-6 text-xs text-slate-500">*Parcelamento sujeito às condições do Mercado Pago no momento do pagamento.</p>
      </div>
    </div>
  );
}
