"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MapPin, X } from "lucide-react";
import { setDeliveryZip, useDeliveryZip } from "@/components/providers/delivery-zip";
import { cn, formatZip } from "@/lib/utils";

/**
 * "Enviar para": o cliente informa o CEP uma vez e o carrinho já calcula o frete com ele.
 * Não mostra prazo nem preço aqui — esses valores só existem depois da cotação real.
 */
export function DeliveryZipButton({ className, variant = "header" }: { className?: string; variant?: "header" | "strip" }) {
  const zip = useDeliveryZip();
  const [open, setOpen] = useState(false);
  const label = zip ? `CEP ${formatZip(zip)}` : "Informe seu CEP";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          variant === "header"
            ? "flex items-end gap-1 rounded-sm border border-transparent px-2 py-1 text-left hover:border-white"
            : "flex w-full items-center gap-2 bg-ink-soft px-4 py-2.5 text-left text-sm text-white",
          className,
        )}
        aria-haspopup="dialog"
      >
        <MapPin className={cn("shrink-0", variant === "header" ? "mb-0.5 size-5" : "size-4")} aria-hidden />
        {variant === "header" ? (
          <span className="leading-tight">
            <span className="block text-xs text-white/70">Enviar para</span>
            <span className="block whitespace-nowrap text-sm font-bold">{label}</span>
          </span>
        ) : (
          <span>
            Enviar para <strong>{zip ? formatZip(zip) : "seu CEP"}</strong>
          </span>
        )}
      </button>
      {open && <ZipDialog current={zip} onClose={() => setOpen(false)} />}
    </>
  );
}

function ZipDialog({ current, onClose }: { current: string | null; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("cep") ?? "");
    if (!setDeliveryZip(value)) {
      setError("Digite um CEP com 8 números.");
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[15vh]" role="dialog" aria-modal="true" aria-labelledby="cep-titulo">
      <button type="button" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Fechar" />
      <div className="relative w-full max-w-sm animate-fade-up overflow-hidden rounded-lg bg-white text-ink shadow-2xl">
        <div className="flex items-center justify-between bg-slate-100 px-5 py-3">
          <h2 id="cep-titulo" className="font-bold">
            Escolha onde receber
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-ink" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5" noValidate>
          <p className="text-sm text-slate-600">O frete e o prazo de entrega variam conforme o CEP. Vamos usar este CEP para calcular o frete no carrinho.</p>
          <label htmlFor="cep-entrega" className="mt-4 block text-sm font-semibold">
            CEP
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              ref={inputRef}
              id="cep-entrega"
              name="cep"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              maxLength={9}
              defaultValue={current ? formatZip(current) : ""}
              aria-invalid={!!error}
              aria-describedby={error ? "cep-erro" : undefined}
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button type="submit" className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
              Confirmar
            </button>
          </div>
          {error && (
            <p id="cep-erro" role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
              Não sei meu CEP
            </a>
            {current && (
              <button
                type="button"
                className="text-slate-500 hover:text-ink hover:underline"
                onClick={() => {
                  setDeliveryZip(null);
                  onClose();
                }}
              >
                Remover CEP
              </button>
            )}
          </div>
          {current && (
            <Link href="/carrinho" onClick={onClose} className="mt-4 block text-center text-sm font-semibold text-brand-700 hover:underline">
              Ver frete no carrinho
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
