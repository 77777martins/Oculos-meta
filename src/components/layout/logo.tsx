import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted = false, name = "Óculos Meta Store" }: { className?: string; inverted?: boolean; name?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${name} — página inicial`}>
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-900 shadow-[0_6px_20px_-6px_rgb(37_71_234/0.7)]">
        <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2.5" y="8" width="8" height="7" rx="3" />
          <rect x="13.5" y="8" width="8" height="7" rx="3" />
          <path d="M10.5 10.5c1-.8 2-.8 3 0" />
        </svg>
      </span>
      <span className={cn("whitespace-nowrap font-display text-[17px] font-semibold tracking-tight", inverted ? "text-white" : "text-ink")}>{name}</span>
    </Link>
  );
}
