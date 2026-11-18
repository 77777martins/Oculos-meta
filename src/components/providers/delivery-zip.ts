"use client";

import { useSyncExternalStore } from "react";
import { onlyDigits } from "@/lib/utils";

/**
 * CEP de entrega escolhido pelo cliente ("Enviar para..." no cabeçalho).
 * Fica só no navegador (nunca é enviado sem uma ação do cliente) e é reaproveitado
 * no carrinho para calcular o frete. Mesmo padrão do carrinho: useSyncExternalStore,
 * sem hydration mismatch, sincronizado entre abas.
 */
const KEY = "oms_delivery_zip_v1";
const listeners = new Set<() => void>();
let value: string | null = null;
let loaded = false;

function read(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && /^\d{8}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      value = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string | null {
  if (!loaded) {
    value = read();
    loaded = true;
  }
  return value;
}

export function useDeliveryZip(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** Salva um CEP válido (8 dígitos) ou limpa com `null`. Retorna false se o CEP for inválido. */
export function setDeliveryZip(input: string | null): boolean {
  const next = input === null ? null : onlyDigits(input);
  if (next !== null && next.length !== 8) return false;
  value = next;
  loaded = true;
  try {
    if (next) window.localStorage.setItem(KEY, next);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* modo privado: mantém só em memória */
  }
  listeners.forEach((l) => l());
  return true;
}
