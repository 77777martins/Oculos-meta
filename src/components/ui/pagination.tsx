import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paginação acessível baseada em links (funciona sem JavaScript e é indexável). */
export function Pagination({ page, pages, buildHref }: { page: number; pages: number; buildHref: (page: number) => string }) {
  if (pages <= 1) return null;
  const window = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-1">
      <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Página anterior">
        <ChevronLeft className="size-4" />
      </PageLink>
      {window.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && window[i - 1]! < p - 1 && <span className="px-1 text-slate-400">…</span>}
          <Link
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn("flex size-10 items-center justify-center rounded-full text-sm font-medium", p === page ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-100")}
          >
            {p}
          </Link>
        </span>
      ))}
      <PageLink href={buildHref(page + 1)} disabled={page >= pages} label="Próxima página">
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="flex size-10 items-center justify-center rounded-full text-slate-300">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className="flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100">
      {children}
    </Link>
  );
}
