"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";

interface VariantStock {
  id: string;
  sku: string;
  name: string;
  stock: number;
  reserved: number;
}

export function StockPanel({ variants, canWrite }: { variants: VariantStock[]; canWrite: boolean }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/api/admin/inventory", { body: { variantId, delta: Number(delta), reason } });
      toast.success("Estoque ajustado");
      setDelta("");
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error("Ajuste não realizado", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-2">Variante</th>
            <th className="py-2 text-right">Físico</th>
            <th className="py-2 text-right">Reservado</th>
            <th className="py-2 text-right">Disponível</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {variants.map((v) => (
            <tr key={v.id}>
              <td className="py-2">
                {v.name} <span className="font-mono text-xs text-slate-500">{v.sku}</span>
              </td>
              <td className="py-2 text-right tabular-nums">{v.stock}</td>
              <td className="py-2 text-right tabular-nums text-amber-700">{v.reserved}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{v.stock - v.reserved}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {canWrite && variants.length > 0 && (
        <form onSubmit={submit} className="mt-6 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-4">
          <Select label="Variante" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku}
              </option>
            ))}
          </Select>
          <Input label="Quantidade (+/−)" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Ex.: 10 ou -2" required />
          <Input label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="NF 1234, avaria…" required minLength={3} />
          <div className="flex items-end">
            <Button type="submit" variant="dark" loading={busy} disabled={!delta || Number(delta) === 0}>
              Ajustar estoque
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
