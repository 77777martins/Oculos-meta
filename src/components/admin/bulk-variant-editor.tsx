"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { formatBRL, parseBRLToCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface EditableVariant {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  priceCents: number;
  salePriceCents: number | null;
  stock: number;
  reserved: number;
}

interface Row {
  price: string;
  sale: string;
  stock: string;
}

const toInput = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));

/** Planilha de preços e estoque: edita várias linhas e salva tudo de uma vez (tudo ou nada). */
export function BulkVariantEditor({ variants }: { variants: EditableVariant[] }) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(() => Object.fromEntries(variants.map((v) => [v.variantId, { price: toInput(v.priceCents), sale: toInput(v.salePriceCents), stock: String(v.stock) }])), [variants]);
  const [rows, setRows] = useState<Record<string, Row>>(initial);
  const [reason, setReason] = useState("Atualização de preços e estoque");
  const [busy, setBusy] = useState(false);

  const set = (id: string, field: keyof Row, value: string) => setRows((r) => ({ ...r, [id]: { ...r[id]!, [field]: value } }));
  const dirty = variants.filter((v) => JSON.stringify(rows[v.variantId]) !== JSON.stringify(initial[v.variantId]));

  /** Valida no navegador só para orientar; o servidor valida de novo. */
  function rowError(v: EditableVariant): string | null {
    const r = rows[v.variantId]!;
    const price = parseBRLToCents(r.price);
    const sale = r.sale.trim() ? parseBRLToCents(r.sale) : null;
    const stock = Number(r.stock);
    if (price === null || price < 1) return "Preço inválido";
    if (r.sale.trim() && (sale === null || sale < 1)) return "Promoção inválida";
    if (sale !== null && sale >= price) return "Promoção deve ser menor que o preço";
    if (!Number.isInteger(stock) || stock < 0) return "Estoque inválido";
    if (stock < v.reserved) return `Mínimo ${v.reserved} (reservado)`;
    return null;
  }

  const errors = dirty.map((v) => rowError(v)).filter(Boolean);

  async function save() {
    if (dirty.length === 0 || errors.length > 0) return;
    setBusy(true);
    try {
      const items = dirty.map((v) => {
        const r = rows[v.variantId]!;
        return { variantId: v.variantId, priceCents: parseBRLToCents(r.price)!, salePriceCents: r.sale.trim() ? parseBRLToCents(r.sale)! : null, stock: Number(r.stock) };
      });
      const res = await apiFetch<{ changed: number }>("/api/admin/variants", { method: "PATCH", body: { reason, items } });
      toast.success("Alterações salvas", `${res.changed} variante(s) atualizada(s).`);
      router.refresh();
    } catch (e) {
      toast.error("Nada foi salvo", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const cell = "h-9 w-full rounded-lg border border-slate-200 px-2 text-sm tabular-nums focus:border-brand-500 focus:outline-none";
  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Produto / cor</th>
              <th className="px-3 py-3">SKU</th>
              <th className="w-32 px-3 py-3">Preço (R$)</th>
              <th className="w-32 px-3 py-3">Promoção (R$)</th>
              <th className="w-28 px-3 py-3">Estoque</th>
              <th className="w-24 px-3 py-3">Reservado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {variants.map((v) => {
              const r = rows[v.variantId]!;
              const changed = dirty.includes(v);
              const err = changed ? rowError(v) : null;
              return (
                <tr key={v.variantId} className={cn(changed && "bg-amber-50/60")}>
                  <td className="px-4 py-2">
                    <p className="font-medium">{v.productName}</p>
                    <p className="text-xs text-slate-500">{v.variantName}</p>
                    {err && <p className="text-xs font-medium text-red-600">{err}</p>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{v.sku}</td>
                  <td className="px-3 py-2">
                    <input aria-label={`Preço de ${v.productName} ${v.variantName}`} inputMode="decimal" value={r.price} onChange={(e) => set(v.variantId, "price", e.target.value)} className={cell} />
                  </td>
                  <td className="px-3 py-2">
                    <input aria-label={`Preço promocional de ${v.productName} ${v.variantName}`} inputMode="decimal" placeholder="—" value={r.sale} onChange={(e) => set(v.variantId, "sale", e.target.value)} className={cell} />
                  </td>
                  <td className="px-3 py-2">
                    <input aria-label={`Estoque de ${v.productName} ${v.variantName}`} inputMode="numeric" value={r.stock} onChange={(e) => set(v.variantId, "stock", e.target.value)} className={cell} />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-500">{v.reserved}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <label className="min-w-64 flex-1 text-sm text-slate-600">
          Motivo (fica no histórico de estoque)
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
        </label>
        <p className="text-sm text-slate-600">{dirty.length === 0 ? "Nenhuma alteração" : `${dirty.length} linha(s) alterada(s)`}</p>
        <Button onClick={save} loading={busy} disabled={dirty.length === 0 || errors.length > 0 || reason.trim().length < 3}>
          Salvar alterações
        </Button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Estoque é a quantidade física. A diferença para o valor atual é registrada como entrada ou ajuste no histórico. Exemplo de preço: {formatBRL(329900)} → digite 3299,00.
      </p>
    </div>
  );
}
