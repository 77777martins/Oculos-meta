import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** Tabela responsiva (rolagem horizontal no celular). */
export function DataTable<T>({ rows, columns, rowKey, empty = "Nenhum registro encontrado.", rowHref }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: string; rowHref?: (r: T) => string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className={cn("px-4 py-3 font-semibold", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={rowKey(r)} className="transition-colors hover:bg-slate-50/70">
                {columns.map((c, i) => (
                  <td key={c.header} className={cn("px-4 py-3 align-middle", c.className)}>
                    {i === 0 && rowHref ? (
                      <Link href={rowHref(r)} className="font-medium text-brand-700 hover:underline">
                        {c.cell(r)}
                      </Link>
                    ) : (
                      c.cell(r)
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft">
      {children}
      <button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-700">
        Filtrar
      </button>
    </form>
  );
}

export const filterInput = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none";
