import { cn } from "@/lib/utils";

/**
 * Ilustração vetorial original de óculos — usada como placeholder até o
 * administrador cadastrar fotos oficiais/licenciadas. Não reproduz marcas.
 */
export function GlassesArt({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const frame = tone === "dark" ? "#0a0f1e" : "#e2e8f0";
  return (
    <svg viewBox="0 0 400 180" className={cn("h-auto w-full", className)} role="img" aria-label="Ilustração de óculos inteligentes">
      <defs>
        <linearGradient id="lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b66f5" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#0b1437" stopOpacity="0.85" />
          <stop offset="1" stopColor="#608bfa" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M8 62 L40 54" stroke={frame} strokeWidth="10" strokeLinecap="round" />
      <path d="M392 62 L360 54" stroke={frame} strokeWidth="10" strokeLinecap="round" />
      <rect x="36" y="44" width="140" height="100" rx="34" fill="url(#lens)" stroke={frame} strokeWidth="12" />
      <rect x="224" y="44" width="140" height="100" rx="34" fill="url(#lens)" stroke={frame} strokeWidth="12" />
      <path d="M176 70 Q200 52 224 70" stroke={frame} strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M60 62 L120 128" stroke="url(#shine)" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
      <path d="M248 62 L308 128" stroke="url(#shine)" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
      <circle cx="52" cy="58" r="5" fill="#93b4fd" />
      <circle cx="348" cy="58" r="5" fill="#93b4fd" />
    </svg>
  );
}
