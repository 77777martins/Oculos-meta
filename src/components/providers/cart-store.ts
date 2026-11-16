"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import { MAX_CART_LINES, MAX_QTY_PER_ITEM } from "@/lib/validation/checkout";

/**
 * Carrinho no navegador: guarda SOMENTE variantId + quantidade.
 * Preços, nomes e estoque são sempre recalculados no servidor.
 * Usa useSyncExternalStore (sem setState em efeitos, sem hydration mismatch)
 * e sincroniza entre abas pelo evento "storage".
 */
export interface CartItem {
  variantId: string;
  quantity: number;
}

const KEY = "oms_cart_v1";
const EMPTY: CartItem[] = [];
const schema = z.array(z.object({ variantId: z.string().regex(/^[a-z0-9]{20,32}$/i), quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM) })).max(MAX_CART_LINES);

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* modo privado / armazenamento cheio: mantém em memória */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      items = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): CartItem[] {
  if (!loaded) {
    items = read();
    loaded = true;
  }
  return items;
}

const getServerSnapshot = () => EMPTY;

export const cart = {
  add(variantId: string, quantity = 1) {
    const current = getSnapshot();
    const existing = current.find((i) => i.variantId === variantId);
    if (!existing && current.length >= MAX_CART_LINES) return false;
    const next = existing
      ? current.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY_PER_ITEM, i.quantity + quantity) } : i))
      : [...current, { variantId, quantity: Math.min(MAX_QTY_PER_ITEM, quantity) }];
    persist(next);
    return true;
  },
  setQuantity(variantId: string, quantity: number) {
    const q = Math.max(0, Math.min(MAX_QTY_PER_ITEM, Math.floor(quantity)));
    persist(q === 0 ? getSnapshot().filter((i) => i.variantId !== variantId) : getSnapshot().map((i) => (i.variantId === variantId ? { ...i, quantity: q } : i)));
  },
  remove(variantId: string) {
    persist(getSnapshot().filter((i) => i.variantId !== variantId));
  },
  clear() {
    persist(EMPTY);
  },
};

export function useCartItems(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCartCount(): number {
  return useCartItems().reduce((acc, i) => acc + i.quantity, 0);
}
