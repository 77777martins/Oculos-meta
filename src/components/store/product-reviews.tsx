import Link from "next/link";
import { Star } from "lucide-react";
import { Stars } from "@/components/ui/stars";
import { formatDate } from "@/lib/utils";
import type { ProductReviews as Data, ReviewEligibility } from "@/server/services/reviews";
import { ReviewForm } from "./review-form";

const NOTICES: Partial<Record<ReviewEligibility, string>> = {
  NOT_PURCHASED: "Só quem comprou e recebeu este produto pode avaliar.",
  PENDING: "Sua avaliação foi recebida e está aguardando aprovação.",
  REJECTED: "Sua avaliação não foi publicada. Fale com o atendimento se tiver dúvidas.",
};

export function ProductReviews({ productId, slug, reviews, eligibility }: { productId: string; slug: string; reviews: Data; eligibility: ReviewEligibility }) {
  return (
    <section id="avaliacoes" className="mt-20 scroll-mt-8 border-t border-slate-100 pt-12" aria-labelledby="avaliacoes-titulo">
      <h2 id="avaliacoes-titulo" className="text-2xl font-semibold">
        Avaliações de clientes
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div>
          {reviews.count > 0 ? (
            <>
              <div className="flex items-center gap-3">
                <span className="font-display text-5xl font-semibold">{reviews.average.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</span>
                <div>
                  <Stars value={reviews.average} size="size-5" />
                  <p className="mt-1 text-sm text-slate-600">
                    {reviews.count} {reviews.count === 1 ? "avaliação" : "avaliações"}
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-1.5" aria-label="Distribuição das notas">
                {reviews.distribution.map((d) => (
                  <li key={d.rating} className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex w-8 shrink-0 items-center gap-0.5 tabular-nums">
                      {d.rating}
                      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                      <span className="sr-only">{d.rating === 1 ? "estrela" : "estrelas"}</span>
                    </span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(d.count / reviews.count) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right tabular-nums">{d.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-slate-600">Este produto ainda não tem avaliações.</p>
          )}

          <div className="mt-6">
            {eligibility === "CAN_REVIEW" && <ReviewForm productId={productId} />}
            {eligibility === "LOGIN_REQUIRED" && (
              <p className="text-sm text-slate-600">
                Comprou este produto?{" "}
                <Link href={`/entrar?next=/produtos/${slug}%23avaliacoes`} className="font-medium text-brand-700 hover:underline">
                  Entre para avaliar
                </Link>
                .
              </p>
            )}
            {NOTICES[eligibility] && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{NOTICES[eligibility]}</p>}
          </div>
        </div>

        <ul className="space-y-6 lg:col-span-2">
          {reviews.items.map((r) => (
            <li key={r.id} className="border-b border-slate-100 pb-6 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} />
                <span className="text-sm font-semibold">{r.author}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Compra verificada</span>
                <time dateTime={r.createdAt.toISOString()} className="text-xs text-slate-500">
                  {formatDate(r.createdAt)}
                </time>
              </div>
              {/* Texto do cliente como texto puro (escapado pelo React). */}
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{r.comment}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
