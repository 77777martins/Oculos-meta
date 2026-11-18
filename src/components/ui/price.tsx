import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({ cents, listCents, size = "md", className }: { cents: number; listCents?: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const onSale = listCents !== undefined && listCents > cents;
  const pct = onSale ? Math.round(((listCents - cents) / listCents) * 100) : 0;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-semibold tracking-tight text-ink", size === "lg" ? "text-3xl" : size === "md" ? "text-lg" : "text-base")}>{formatBRL(cents)}</span>
      {onSale && (
        <>
          <span className="text-sm text-slate-500 line-through">
            <span className="sr-only">De </span>
            {formatBRL(listCents)}
          </span>
          <span className="text-xs font-semibold text-emerald-700">-{pct}%</span>
        </>
      )}
    </div>
  );
}
