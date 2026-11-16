import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Geometria do selo Visio (viewBox 64×64), compartilhada pelo logo, favicon,
 * ícone de tela inicial e imagem de compartilhamento — mantenha em sincronia
 * com `src/app/icon.svg` e `public/images/brand/visio-mark.svg`.
 */
export const VISIO_SEAL = {
  outerRing: { r: 29.6, strokeWidth: 1.8 },
  innerRing: { r: 25.6, strokeWidth: 0.9 },
  v: "M18.5 19.4 L32 46.5 L45.5 19.4",
  vStrokeWidth: 3.6,
  serifs: "M12.6 19.4 H24.3 M39.7 19.4 H51.4",
  serifStrokeWidth: 1.5,
} as const;

/** Selo circular com monograma "V". Usa `currentColor`, então herda a cor do texto. */
export function VisioMark({ className }: { className?: string }) {
  const s = VISIO_SEAL;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <circle cx="32" cy="32" r={s.outerRing.r} strokeWidth={s.outerRing.strokeWidth} />
      <circle cx="32" cy="32" r={s.innerRing.r} strokeWidth={s.innerRing.strokeWidth} />
      <path d={s.v} strokeWidth={s.vStrokeWidth} strokeLinejoin="miter" strokeMiterlimit={10} />
      <path d={s.serifs} strokeWidth={s.serifStrokeWidth} />
    </svg>
  );
}

/** Remove o sufixo "Store/Loja" do nome: o wordmark mostra só o nome da marca. */
function brandWord(name: string): string {
  return name.replace(/\s+(store|loja)$/i, "").trim() || name;
}

export function Logo({
  className,
  inverted = false,
  name = "Visio Store",
  tagline = "Óculos inteligentes",
}: {
  className?: string;
  inverted?: boolean;
  name?: string;
  tagline?: string | null;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3", inverted ? "text-white" : "text-ink", className)}
      aria-label={`${name} — página inicial`}
    >
      <VisioMark className="size-10 shrink-0 transition-transform duration-500 group-hover:rotate-[8deg]" />
      <span className="flex flex-col leading-none">
        {/* margem negativa compensa o espaçamento após a última letra, mantendo o texto centralizado */}
        <span className="-mr-[0.3em] whitespace-nowrap font-sans text-[21px] font-normal uppercase tracking-[0.3em]">
          {brandWord(name)}
        </span>
        {tagline && (
          <span
            className={cn(
              "mt-1.5 hidden whitespace-nowrap text-[8.5px] sm:block font-medium uppercase tracking-[0.32em]",
              inverted ? "text-white/60" : "text-ink/55",
            )}
          >
            {tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
