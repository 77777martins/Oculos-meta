"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { parseBRLToCents } from "@/lib/money";
import { MANUAL_TRANSITIONS, ORDER_STATUS_LABELS, SHIPMENT_STATUS_LABELS } from "@/server/services/order-state";

function useAction() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      router.refresh();
      return true;
    } catch (e) {
      toast.error("Ação não concluída", (e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

export function OrderStatusForm({ orderId, status, canUpdate }: { orderId: string; status: OrderStatus; canUpdate: boolean }) {
  const options = MANUAL_TRANSITIONS[status] ?? [];
  const [to, setTo] = useState<string>(options[0] ?? "");
  const [note, setNote] = useState("");
  const { busy, run } = useAction();
  if (!canUpdate || options.length === 0) return <p className="text-sm text-slate-500">Nenhuma alteração manual disponível para este status.</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (to === "CANCELLED" && !confirm("Confirmar cancelamento do pedido?")) return;
        if (await run(() => apiFetch(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: { status: to, note: note || null } }), "Status atualizado")) setNote("");
      }}
    >
      <Select label="Novo status" value={to} onChange={(e) => setTo(e.target.value)}>
        {options.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <Textarea label="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
      <Button type="submit" loading={busy} variant={to === "CANCELLED" ? "danger" : "primary"}>
        Aplicar
      </Button>
    </form>
  );
}

export function ShipmentForm({ orderId, initial }: { orderId: string; initial: { carrier: string | null; service: string | null; trackingCode: string | null; trackingUrl: string | null } | null }) {
  const { busy, run } = useAction();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(
      () =>
        apiFetch(`/api/admin/orders/${orderId}/shipment`, {
          method: "PUT",
          body: { carrier: f.get("carrier"), service: f.get("service") || null, trackingCode: f.get("trackingCode"), trackingUrl: f.get("trackingUrl") || null },
        }),
      "Rastreio salvo",
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Input name="carrier" label="Transportadora" defaultValue={initial?.carrier ?? ""} required />
      <Input name="service" label="Serviço" defaultValue={initial?.service ?? ""} />
      <Input name="trackingCode" label="Código de rastreio" defaultValue={initial?.trackingCode ?? ""} required />
      <Input name="trackingUrl" label="URL de rastreio (opcional)" type="url" defaultValue={initial?.trackingUrl ?? ""} />
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy} variant="dark">
          Salvar rastreio
        </Button>
      </div>
    </form>
  );
}

export function ShipmentEventForm({ orderId }: { orderId: string }) {
  const { busy, run } = useAction();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ok = await run(
      () =>
        apiFetch(`/api/admin/orders/${orderId}/shipment/events`, {
          body: { status: f.get("status"), description: f.get("description"), location: f.get("location") || null, occurredAt: new Date(String(f.get("occurredAt"))).toISOString() },
        }),
      "Movimentação registrada",
    );
    if (ok) form.reset();
  }
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Select name="status" label="Status" required>
        {Object.entries(SHIPMENT_STATUS_LABELS)
          .filter(([k]) => k !== "PENDING")
          .map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
      </Select>
      <Input name="occurredAt" label="Data/hora (informada pela transportadora)" type="datetime-local" required />
      <Input name="description" label="Descrição" className="sm:col-span-2" placeholder="Ex.: Objeto em trânsito para a unidade de distribuição" required maxLength={300} />
      <Input name="location" label="Local (opcional)" maxLength={120} />
      <div className="flex items-end">
        <Button type="submit" loading={busy} variant="outline">
          Adicionar movimentação
        </Button>
      </div>
    </form>
  );
}

export function PaymentActions({ paymentId, remainingCents, canRefund, canSync }: { paymentId: string; remainingCents: number; canRefund: boolean; canSync: boolean }) {
  const { busy, run } = useAction();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {canSync && (
          <Button size="sm" variant="outline" loading={busy} onClick={() => run(() => apiFetch(`/api/admin/payments/${paymentId}/sync`, { method: "POST" }), "Status consultado no Mercado Pago")}>
            Consultar no Mercado Pago
          </Button>
        )}
        {canRefund && remainingCents > 0 && (
          <Button size="sm" variant="danger" onClick={() => setOpen((o) => !o)}>
            Reembolsar
          </Button>
        )}
      </div>
      {open && (
        <form
          className="grid gap-3 rounded-xl bg-red-50/60 p-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const cents = amount.trim() ? parseBRLToCents(amount) : undefined;
            if (cents === null) return;
            if (!confirm(`Confirmar reembolso de ${amount.trim() ? `R$ ${amount}` : "valor TOTAL"}? Esta ação é irreversível.`)) return;
            if (await run(() => apiFetch(`/api/admin/payments/${paymentId}/refund`, { body: { reason, ...(cents ? { amountCents: cents } : {}) } }), "Reembolso solicitado")) setOpen(false);
          }}
        >
          <Input label="Valor (R$) — vazio = total" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={(remainingCents / 100).toFixed(2).replace(".", ",")} />
          <Input label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={300} />
          <div className="sm:col-span-2">
            <Button type="submit" variant="danger" size="sm" loading={busy}>
              Confirmar reembolso
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
