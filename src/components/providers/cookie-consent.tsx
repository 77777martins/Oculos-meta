"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "oms_cookie_consent_v1";

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const getSnapshot = () => {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return "unavailable";
  }
};

/**
 * Aviso de cookies (LGPD). A loja usa apenas cookies estritamente necessários
 * (sessão/segurança). Cookies analíticos só seriam ativados com consentimento,
 * que é registrado no servidor com versão e data.
 */
export function CookieConsent() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => "ssr");
  const [hidden, setHidden] = useState(false);
  if (hidden || stored !== null) return null;

  async function decide(analytics: boolean) {
    setHidden(true);
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ analytics, at: new Date().toISOString() }));
    } catch {
      /* ignora */
    }
    await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analytics }) }).catch(() => undefined);
  }

  return (
    <div role="dialog" aria-live="polite" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl animate-fade-up border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-16px_rgb(10_15_30/0.3)] sm:inset-x-6 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-3">
          <Cookie className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
          <p className="text-sm text-slate-700">
            Usamos cookies essenciais para login, carrinho e segurança. Com sua permissão, também poderemos usar cookies de análise para melhorar a loja.{" "}
            <Link href="/politica-de-privacidade" className="font-semibold text-ink underline underline-offset-2 hover:underline">
              Saiba mais
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="rounded-none" onClick={() => decide(false)}>
            Só essenciais
          </Button>
          <Button variant="dark" size="sm" className="rounded-none" onClick={() => decide(true)}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
