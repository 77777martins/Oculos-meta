"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch, ApiClientError } from "@/lib/http/client";
import { parseBRLToCents } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { DataTable, Panel, type Column } from "./ui";
import { ImageUploadButton } from "./image-upload";

export type FieldType = "text" | "textarea" | "number" | "money" | "checkbox" | "select" | "datetime" | "image" | "slug";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: Array<{ value: string; label: string }>;
  hint?: string;
  /** Campo de origem para gerar o slug automaticamente. */
  slugFrom?: string;
  wide?: boolean;
  optional?: boolean;
}

type Values = Record<string, string | boolean>;
type Row = { id: string } & Record<string, unknown>;

function toFormValue(field: FieldDef, raw: unknown): string | boolean {
  if (field.type === "checkbox") return Boolean(raw);
  if (raw === null || raw === undefined) return "";
  if (field.type === "money") return (Number(raw) / 100).toFixed(2).replace(".", ",");
  if (field.type === "datetime") {
    const d = new Date(String(raw));
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
  return String(raw);
}

/** Converte os valores digitados para o formato que a API espera (o servidor valida com Zod). */
function toPayload(fields: FieldDef[], values: Values): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === "checkbox") out[f.name] = Boolean(v);
    else if (typeof v !== "string" || v.trim() === "") out[f.name] = f.optional ? null : f.type === "number" || f.type === "money" ? 0 : "";
    else if (f.type === "money") out[f.name] = parseBRLToCents(v);
    else if (f.type === "number") out[f.name] = Number(v);
    else if (f.type === "datetime") out[f.name] = new Date(v).toISOString();
    else out[f.name] = v.trim();
  }
  return out;
}

interface Props {
  title: string;
  endpoint: string;
  rows: Row[];
  fields: FieldDef[];
  columns: Column<Row>[];
  defaults: Values;
  /** Ajuste opcional do payload (ex.: unidade do valor do cupom). */
  transform?: (payload: Record<string, unknown>) => Record<string, unknown>;
  /** Ajuste opcional dos valores iniciais ao editar. */
  toForm?: (row: Row, values: Values) => Values;
  deleteLabel?: string;
  help?: ReactNode;
}

export function EntityManager({ title, endpoint, rows, fields, columns, defaults, transform, toForm, deleteLabel = "Excluir", help }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [values, setValues] = useState<Values>(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function open(row: Row | "new") {
    setErrors({});
    if (row === "new") setValues(defaults);
    else {
      const base = Object.fromEntries(fields.map((f) => [f.name, toFormValue(f, row[f.name])]));
      setValues(toForm ? toForm(row, base) : base);
    }
    setEditing(row);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      let payload = toPayload(fields, values);
      if (transform) payload = transform(payload);
      const isNew = editing === "new";
      await apiFetch(isNew ? endpoint : `${endpoint}/${(editing as Row).id}`, { method: isNew ? "POST" : "PUT", body: payload });
      toast.success("Salvo com sucesso");
      setEditing(null);
      router.refresh();
    } catch (err) {
      const e2 = err as ApiClientError;
      if (e2.fieldErrors) setErrors(Object.fromEntries(Object.entries(e2.fieldErrors).map(([k, v]) => [k, v[0] ?? "Inválido"])));
      toast.error("Não foi possível salvar", e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!confirm(`${deleteLabel}? Esta ação não pode ser desfeita.`)) return;
    try {
      await apiFetch(`${endpoint}/${row.id}`, { method: "DELETE" });
      toast.success("Removido");
      router.refresh();
    } catch (err) {
      toast.error("Não foi possível remover", (err as Error).message);
    }
  }

  const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }));

  return (
    <div className="space-y-6">
      {help}
      {editing ? (
        <Panel title={editing === "new" ? `Novo — ${title}` : `Editar — ${title}`}>
          <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const common = { label: f.label, error: errors[f.name], hint: f.hint };
              const val = values[f.name];
              const cls = f.wide || f.type === "textarea" ? "sm:col-span-2" : undefined;
              switch (f.type) {
                case "checkbox":
                  return <Checkbox key={f.name} className="self-end" label={f.label} checked={Boolean(val)} onChange={(e) => set(f.name, e.target.checked)} error={errors[f.name]} />;
                case "textarea":
                  return <Textarea key={f.name} className={cls} {...common} rows={4} value={String(val ?? "")} onChange={(e) => set(f.name, e.target.value)} />;
                case "select":
                  return (
                    <Select key={f.name} className={cls} label={f.label} error={errors[f.name]} value={String(val ?? "")} onChange={(e) => set(f.name, e.target.value)}>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  );
                case "image":
                  return (
                    <div key={f.name} className="sm:col-span-2">
                      <Input {...common} value={String(val ?? "")} onChange={(e) => set(f.name, e.target.value)} placeholder="https://… ou envie um arquivo" />
                      <div className="mt-2">
                        <ImageUploadButton folder="banners" onUploaded={(url) => set(f.name, url)} />
                      </div>
                    </div>
                  );
                default:
                  return (
                    <Input
                      key={f.name}
                      className={cls}
                      {...common}
                      type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : "text"}
                      inputMode={f.type === "money" ? "decimal" : undefined}
                      value={String(val ?? "")}
                      onChange={(e) => set(f.name, e.target.value)}
                      onBlur={
                        f.type === "text" && fields.some((x) => x.slugFrom === f.name)
                          ? (e) => {
                              const slugField = fields.find((x) => x.slugFrom === f.name)!;
                              if (!values[slugField.name]) set(slugField.name, slugify(e.target.value));
                            }
                          : undefined
                      }
                    />
                  );
              }
            })}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={busy}>
                Salvar
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Panel>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => open("new")} icon={<Plus className="size-4" />}>
            Adicionar
          </Button>
        </div>
      )}
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          ...columns,
          {
            header: "Ações",
            className: "text-right",
            cell: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => open(r)} icon={<Pencil className="size-3.5" />}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r)} icon={<Trash2 className="size-3.5" />} aria-label={deleteLabel} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
