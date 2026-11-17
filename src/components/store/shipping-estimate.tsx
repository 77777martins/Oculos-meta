"use client";

import { useState, type FormEvent } from "react";
import { Truck } from "lucide-react";
import { useCartQuote } from "@/components/checkout/use-cart-quote";
import { setDeliveryZip, useDeliveryZip } from "@/components/providers/delivery-zip";
import { formatBRL } from "@/lib/money";
import { formatZip } from "@/lib/utils";

/**
 * Frete e prazo na página do produto. Usa o CEP salvo em "Enviar para" e a MESMA
 * cotação do carrinho (calculada no servidor) — nenhum valor é estimado no navegador.
 */
export function ShippingEstimate({ variantId, quantity }: { variantId: string; quantity: number }) {
  const zip = useDeliveryZip();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!setDeliveryZip(String(new FormData(e.currentTarget).get("cep") ?? ""))) {
      setError("Digite um CEP com 8 números.");
      return;
    }
    setError(null);
    setEditing(false);
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 p-4" aria-label="Frete e prazo de entrega">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="size-4 text-brand-600" aria-hidden /> Frete e prazo
      </p>
      {zip && !editing ? (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Entrega para <strong className="text-ink">{formatZip(zip)}</strong>{" "}
            <button type="button" onClick={() => setEditing(true)} className="text-brand-700 hover:underline">
              alterar
            </button>
          </p>
          <ShippingOptions variantId={variantId} quantity={quantity} zip={zip} />
        </>
      ) : (
        <form onSubmit={onSubmit} className="mt-3" noValidate>
          <div className="flex gap-2">
            <label htmlFor="cep-produto" className="sr-only">
              CEP de entrega
            </label>
            <input
              id="cep-produto"
              name="cep"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="Digite seu CEP"
              maxLength={9}
              defaultValue={zip ? formatZip(zip) : ""}
              aria-invalid={!!error}
              aria-describedby={error ? "cep-produto-erro" : undefined}
              className="h-10 min-w-0 flex-1 rounded-full border border-slate-200 px-4 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button type="submit" className="h-10 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-700">
              Calcular
            </button>
          </div>
          {error && (
            <p id="cep-produto-erro" role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

function ShippingOptions({ variantId, quantity, zip }: { variantId: string; quantity: number; zip: string }) {
  const { quote, loading, error } = useCartQuote([{ variantId, quantity }], zip);
  if (error) return <p className="mt-2 text-sm text-slate-500">Não foi possível calcular agora. O frete é confirmado no carrinho.</p>;
  if (loading || !quote) return <p className="mt-2 text-sm text-slate-500">Calculando…</p>;
  if (quote.shippingOptions.length === 0) return <p className="mt-2 text-sm text-amber-700">Não entregamos neste CEP no momento.</p>;
  return (
    <ul className="mt-2 space-y-1.5 text-sm">
      {quote.shippingOptions.map((o) => (
        <li key={o.id} className="flex justify-between gap-3">
          <span className="text-slate-600">
            {o.carrier} {o.serviceName} · {o.minDays}–{o.maxDays} dias úteis
          </span>
          <strong className={o.priceCents === 0 ? "text-emerald-700" : "text-ink"}>{o.priceCents === 0 ? "Grátis" : formatBRL(o.priceCents)}</strong>
        </li>
      ))}
    </ul>
  );
}
