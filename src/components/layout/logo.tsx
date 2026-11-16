import Link from "next/link";
import { cn } from "@/lib/utils";

/** Símbolo da marca Visio: um "V" cujas pontas são lentes Wayfarer (óculos vistos de frente). */
export function VisioMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="visio-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f7bff" />
          <stop offset="0.5" stopColor="#1f38c9" />
          <stop offset="1" stopColor="#0b1437" />
        </linearGradient>
        <linearGradient id="visio-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfd3fe" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0b1437" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#visio-bg)" />
      <path d="M15 21.5 L32 49 L49 21.5" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="14" width="18" height="12" rx="4.5" fill="url(#visio-lens)" stroke="#fff" strokeWidth="2.6" />
      <rect x="37" y="14" width="18" height="12" rx="4.5" fill="url(#visio-lens)" stroke="#fff" strokeWidth="2.6" />
      <path d="M27 18.2 Q32 15.6 37 18.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M13 23 L18 16.6" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M41 23 L46 16.6" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverted = false, name = "Visio Store" }: { className?: string; inverted?: boolean; name?: string }) {
  // "Visio Store" → "Visio" em destaque + "Store" em tom secundário; outros nomes aparecem inteiros.
  const [first, ...rest] = name.split(" ");
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${name} — página inicial`}>
      <VisioMark className="size-9 shrink-0 drop-shadow-[0_6px_14px_rgb(37_71_234/0.45)] transition-transform duration-300 group-hover:-rotate-3" />
      <span className={cn("whitespace-nowrap font-display text-[19px] leading-none tracking-tight", inverted ? "text-white" : "text-ink")}>
        <span className="font-bold">{first}</span>
        {rest.length > 0 && <span className={cn("ml-1 font-medium", inverted ? "text-brand-300" : "text-brand-600")}>{rest.join(" ")}</span>}
      </span>
    </Link>
  );
}
