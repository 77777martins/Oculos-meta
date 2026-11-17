"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/http/client";
import { cn } from "@/lib/utils";

const LABELS = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const comment = String(new FormData(e.currentTarget).get("comment") ?? "");
    if (rating < 1) return setError("Escolha de 1 a 5 estrelas.");
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/reviews", { body: { productId, rating, comment } });
      setSent(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">Obrigado! Sua avaliação foi enviada e aparece aqui depois de aprovada.</p>;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 p-5" noValidate>
      <p className="font-semibold">Avalie este produto</p>
      <fieldset className="mt-3">
        <legend className="sr-only">Nota</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-0.5">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
              <Star className={cn("size-8 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} aria-hidden />
              <span className="sr-only">
                {n} {n === 1 ? "estrela" : "estrelas"}
              </span>
            </label>
          ))}
          {rating > 0 && <span className="ml-2 text-sm text-slate-600">{LABELS[rating]}</span>}
        </div>
      </fieldset>
      <label htmlFor="review-comment" className="mt-4 block text-sm font-medium">
        Seu comentário
      </label>
      <textarea
        id="review-comment"
        name="comment"
        required
        minLength={10}
        maxLength={1000}
        rows={4}
        placeholder="Conte como foi usar o produto (mínimo de 10 caracteres)."
        className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand-500 focus:outline-none"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-4" loading={busy}>
        Enviar avaliação
      </Button>
      <p className="mt-3 text-xs text-slate-500">Mostramos apenas seu primeiro nome. A avaliação passa por moderação antes de ser publicada.</p>
    </form>
  );
}
