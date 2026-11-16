"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/http/client";
import type { CartItem } from "@/components/providers/cart-store";
import type { QuotedLine } from "@/server/services/cart";
import type { ShippingOption } from "@/server/services/pricing";

export interface CartQuote {
  lines: QuotedLine[];
  shippingOptions: ShippingOption[];
  coupon: { code: string; type: string } | null;
  couponMessage: string | null;
  totals: { subtotalCents: number; discountCents: number; shippingCents: number; totalCents: number; shippingCalculated: boolean };
}

/**
 * Busca a cotação no servidor sempre que itens/CEP/cupom mudam (com debounce
 * e cancelamento da requisição anterior). Nenhum valor é calculado no cliente.
 */
export function useCartQuote(items: CartItem[], zipCode?: string, couponCode?: string) {
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify({ items, zipCode, couponCode });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<CartQuote>("/api/cart/quote", { body: JSON.parse(key), signal: controller.signal });
        setQuote(data);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key]);

  return { quote, loading, error };
}
