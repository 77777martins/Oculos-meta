"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Minus, Plus, ShoppingBag, Tag, Trash2, Truck } from "lucide-react";
import { cart, useCartItems } from "@/components/providers/cart-store";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductImage } from "@/components/ui/product-image";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/money";
import { formatZip, onlyDigits } from "@/lib/utils";
import { setDeliveryZip, useDeliveryZip } from "@/components/providers/delivery-zip";
import { OrderSummary } from "./order-summary";
import { useCartQuote } from "./use-cart-quote";

export const CHECKOUT_COUPON_KEY = "oms_checkout_coupon";

export function CartView() {
  const items = useCartItems();
  // CEP salvo no cabeçalho ("Enviar para") já calcula o frete; editar aqui também o atualiza.
  const savedZip = useDeliveryZip();
  const [zipInput, setZipInput] = useState<string | null>(null);
  const zip = savedZip ?? undefined;
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>();
  const { quote, loading, error } = useCartQuote(items, zip, coupon);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6" />}
        title="Seu carrinho está vazio"
        description="Explore nossos óculos inteligentes e encontre o modelo ideal para você."
        action={<ButtonLink href="/produtos">Ver modelos</ButtonLink>}
      />
    );
  }

  const hasIssues = quote?.lines.some((l) => l.issue !== null) ?? false;
  const appliedCoupon = quote?.coupon?.code ?? null;

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    setCoupon(code || undefined);
    try {
      if (code) sessionStorage.setItem(CHECKOUT_COUPON_KEY, code);
      else sessionStorage.removeItem(CHECKOUT_COUPON_KEY);
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <section className="lg:col-span-2" aria-label="Itens do carrinho">
        {error && (
          <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-100">
          {!quote
            ? items.map((i) => (
                <li key={i.variantId} className="flex gap-4 p-5">
                  <Skeleton className="size-24 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </li>
              ))
            : quote.lines.map((line) => (
                <li key={line.variantId} className="flex gap-4 p-5">
                  <Link href={`/produtos/${line.productSlug}`} className="shrink-0">
                    <ProductImage src={line.imageUrl} alt={line.productName} className="size-24 rounded-2xl" sizes="96px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/produtos/${line.productSlug}`} className="line-clamp-2 font-semibold hover:text-brand-700">
                          {line.productName}
                        </Link>
                        <p className="text-sm text-slate-500">{line.variantName}</p>
                      </div>
                      <p className="shrink-0 font-semibold">{formatBRL(line.unitPriceCents * line.requestedQuantity)}</p>
                    </div>
                    {line.issue && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                        <AlertTriangle className="size-4" aria-hidden />
                        {line.issue === "UNAVAILABLE" ? "Indisponível no momento — remova para continuar." : `Apenas ${line.available} em estoque — ajuste a quantidade.`}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center rounded-full border border-slate-200" role="group" aria-label={`Quantidade de ${line.productName}`}>
                        <button type="button" className="flex size-9 items-center justify-center rounded-full hover:bg-slate-50" onClick={() => cart.setQuantity(line.variantId, line.requestedQuantity - 1)} aria-label="Diminuir">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{line.requestedQuantity}</span>
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-full hover:bg-slate-50 disabled:opacity-40"
                          onClick={() => cart.setQuantity(line.variantId, line.requestedQuantity + 1)}
                          disabled={line.requestedQuantity >= line.available}
                          aria-label="Aumentar"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button type="button" onClick={() => cart.remove(line.variantId)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600">
                        <Trash2 className="size-4" aria-hidden /> Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
        </ul>
        {quote && quote.lines.length < items.length && (
          <p className="mt-3 text-sm text-amber-700">
            Alguns itens não estão mais disponíveis.{" "}
            <button type="button" className="font-semibold underline" onClick={() => items.filter((i) => !quote.lines.some((l) => l.variantId === i.variantId)).forEach((i) => cart.remove(i.variantId))}>
              Remover indisponíveis
            </button>
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <form
            className="rounded-3xl border border-slate-100 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              setDeliveryZip(onlyDigits(zipInput ?? ""));
            }}
          >
            <label htmlFor="cep" className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="size-4 text-brand-600" aria-hidden /> Calcular frete
            </label>
            <div className="mt-3 flex gap-2">
              <input id="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} value={zipInput ?? (savedZip ? formatZip(savedZip) : "")} onChange={(e) => setZipInput(e.target.value)} className="h-11 w-full rounded-full border border-slate-200 px-4 text-sm focus:border-brand-500 focus:outline-none" />
              <Button type="submit" variant="dark" size="md">
                OK
              </Button>
            </div>
            {zip && quote && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {quote.shippingOptions.length === 0 ? (
                  <li className="text-amber-700">Não entregamos neste CEP no momento.</li>
                ) : (
                  quote.shippingOptions.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2">
                      <span className="text-slate-600">
                        {o.carrier} {o.serviceName} · {o.minDays}–{o.maxDays} dias úteis
                      </span>
                      <span className="font-medium">{o.isFree ? "Grátis" : formatBRL(o.priceCents)}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </form>
          <form
            className="rounded-3xl border border-slate-100 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              applyCoupon();
            }}
          >
            <label htmlFor="cupom" className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="size-4 text-brand-600" aria-hidden /> Cupom de desconto
            </label>
            <div className="mt-3 flex gap-2">
              <input id="cupom" placeholder="CÓDIGO" maxLength={40} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="h-11 w-full rounded-full border border-slate-200 px-4 text-sm uppercase focus:border-brand-500 focus:outline-none" />
              <Button type="submit" variant="dark">
                Aplicar
              </Button>
            </div>
            {coupon && quote && !loading && (
              <p role="status" className={`mt-3 text-sm ${appliedCoupon ? "text-emerald-700" : "text-red-600"}`}>
                {appliedCoupon ? `Cupom ${appliedCoupon} aplicado!` : (quote.couponMessage ?? "Cupom inválido.")}
              </p>
            )}
          </form>
        </div>
      </section>

      <OrderSummary totals={quote?.totals ?? null} loading={loading && !quote} couponCode={appliedCoupon}>
        <ButtonLink href="/checkout" size="lg" className="w-full" aria-disabled={hasIssues} onClick={(e) => hasIssues && e.preventDefault()}>
          Finalizar compra
        </ButtonLink>
        {hasIssues && <p className="mt-2 text-center text-xs text-amber-700">Ajuste os itens indisponíveis para continuar.</p>}
        <Link href="/produtos" className="mt-4 block text-center text-sm font-medium text-brand-700 hover:underline">
          Continuar comprando
        </Link>
      </OrderSummary>
    </div>
  );
}
