import type { ReactNode } from "react";
import { formatBRL } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  totals: { subtotalCents: number; discountCents: number; shippingCents: number; totalCents: number; shippingCalculated?: boolean } | null;
  loading?: boolean;
  couponCode?: string | null;
  children?: ReactNode;
}

export function OrderSummary({ totals, loading, couponCode, children }: Props) {
  return (
    <aside className="rounded-3xl border border-slate-100 bg-surface p-6 lg:sticky lg:top-24" aria-labelledby="resumo">
      <h2 id="resumo" className="text-lg font-semibold">
        Resumo do pedido
      </h2>
      {!totals || loading ? (
        <div className="mt-6 space-y-3" role="status" aria-label="Calculando valores">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      ) : (
        <dl className="mt-6 space-y-3 text-sm">
          <Row label="Subtotal" value={formatBRL(totals.subtotalCents)} />
          {totals.discountCents > 0 && <Row label={`Desconto${couponCode ? ` (${couponCode})` : ""}`} value={`− ${formatBRL(totals.discountCents)}`} tone="text-emerald-700" />}
          <Row label="Frete" value={totals.shippingCalculated === false ? "Informe o CEP" : totals.shippingCents === 0 ? "Grátis" : formatBRL(totals.shippingCents)} />
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-baseline justify-between">
              <dt className="text-base font-semibold">Total</dt>
              <dd className="text-2xl font-semibold tracking-tight">{formatBRL(totals.totalCents)}</dd>
            </div>
          </div>
        </dl>
      )}
      {children && <div className="mt-6">{children}</div>}
    </aside>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-600">{label}</dt>
      <dd className={tone ?? "font-medium text-ink"}>{value}</dd>
    </div>
  );
}
