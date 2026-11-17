import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nota em estrelas (somente leitura). `value` aceita decimais: 4,5 pinta meia estrela. */
export function Stars({ value, className, size = "size-4" }: { value: number; className?: string; size?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value.toLocaleString("pt-BR")} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className={cn("relative", size)} aria-hidden>
            <Star className={cn("absolute inset-0 text-slate-300", size)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("fill-amber-400 text-amber-400", size)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
