"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { formatZip, onlyDigits } from "@/lib/utils";
import { addressSchema, type AddressInput } from "@/lib/validation/address";
import { BR_STATES } from "@/lib/validation/common";

export interface AddressRow {
  id: string;
  label: string | null;
  recipient: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  phone: string | null;
  isDefault: boolean;
}

export function AddressManager({ addresses }: { addresses: AddressRow[] }) {
  const [editing, setEditing] = useState<AddressRow | "new" | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function remove(id: string) {
    if (!confirm("Remover este endereço?")) return;
    try {
      await apiFetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      toast.success("Endereço removido");
      router.refresh();
    } catch (e) {
      toast.error("Erro ao remover", (e as Error).message);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Endereços</h2>
        {!editing && (
          <Button size="sm" onClick={() => setEditing("new")} icon={<Plus className="size-4" />}>
            Novo endereço
          </Button>
        )}
      </div>
      {editing ? (
        <AddressForm
          initial={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : addresses.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<MapPin className="size-6" />} title="Nenhum endereço salvo" description="Salve endereços para agilizar suas próximas compras." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-3xl border border-slate-100 p-5 text-sm">
              <p className="font-semibold">
                {a.label ?? a.recipient} {a.isDefault && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Padrão</span>}
              </p>
              <p className="mt-2 text-slate-600">
                {a.recipient}
                <br />
                {a.street}, {a.number}
                {a.complement ? ` — ${a.complement}` : ""}
                <br />
                {a.district} · {a.city}/{a.state} · {formatZip(a.zipCode)}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(a)} icon={<Pencil className="size-3.5" />}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} icon={<Trash2 className="size-3.5" />}>
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddressForm({ initial, onDone }: { initial: AddressRow | null; onDone: () => void }) {
  const toast = useToast();
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial
      ? { ...initial, state: initial.state as AddressInput["state"], complement: initial.complement ?? "", phone: initial.phone ?? "", label: initial.label ?? "" }
      : { isDefault: false, label: "", complement: "", phone: "" },
  });
  const e = form.formState.errors;

  async function onZip(raw: string) {
    const d = onlyDigits(raw);
    if (d.length !== 8) return;
    try {
      const r = await apiFetch<{ street: string; district: string; city: string; state: string }>(`/api/cep/${d}`);
      if (r.street) form.setValue("street", r.street);
      if (r.district) form.setValue("district", r.district);
      if (r.city) form.setValue("city", r.city);
      if (r.state) form.setValue("state", r.state as AddressInput["state"]);
    } catch {
      /* manual */
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiFetch(initial ? `/api/account/addresses/${initial.id}` : "/api/account/addresses", { method: initial ? "PUT" : "POST", body: values });
      toast.success(initial ? "Endereço atualizado" : "Endereço salvo");
      onDone();
    } catch (err) {
      toast.error("Não foi possível salvar", (err as Error).message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4 rounded-3xl border border-slate-100 p-6 sm:grid-cols-6">
      <Input className="sm:col-span-2" label="Apelido (opcional)" placeholder="Casa, Trabalho…" {...form.register("label")} />
      <Input className="sm:col-span-4" label="Destinatário" {...form.register("recipient")} error={e.recipient?.message} />
      <Input className="sm:col-span-2" label="CEP" inputMode="numeric" maxLength={9} {...form.register("zipCode", { onBlur: (ev) => onZip(ev.target.value) })} error={e.zipCode?.message} />
      <Input className="sm:col-span-4" label="Rua" {...form.register("street")} error={e.street?.message} />
      <Input className="sm:col-span-2" label="Número" {...form.register("number")} error={e.number?.message} />
      <Input className="sm:col-span-4" label="Complemento" {...form.register("complement")} />
      <Input className="sm:col-span-2" label="Bairro" {...form.register("district")} error={e.district?.message} />
      <Input className="sm:col-span-3" label="Cidade" {...form.register("city")} error={e.city?.message} />
      <Select className="sm:col-span-1" label="UF" {...form.register("state")} error={e.state?.message}>
        <option value="">—</option>
        {BR_STATES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Select>
      <Input className="sm:col-span-3" label="Telefone (opcional)" type="tel" {...form.register("phone")} error={e.phone?.message} />
      <Checkbox className="self-end sm:col-span-3" label="Usar como endereço padrão" {...form.register("isDefault")} />
      <div className="flex gap-2 sm:col-span-6">
        <Button type="submit" loading={form.formState.isSubmitting}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
