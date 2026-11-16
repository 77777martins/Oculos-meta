"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { formatDateTime } from "@/lib/utils";
import { DataTable, Panel } from "./ui";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastLoginAt: Date | null;
}

export function StaffManager({ staff, currentUserId }: { staff: Staff[]; currentUserId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("SUPPORT");
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      router.refresh();
    } catch (e) {
      toast.error("Não foi possível concluir", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Adicionar membro da equipe">
        <form
          className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => apiFetch("/api/admin/staff", { body: { email, role } }), "Permissão concedida").then(() => setEmail(""));
          }}
        >
          <Input label="E-mail da conta (já cadastrada na loja)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Select label="Papel" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="SUPPORT">{ROLE_LABELS.SUPPORT}</option>
            <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
            <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
          </Select>
          <div className="flex items-end">
            <Button type="submit" loading={busy}>
              Conceder
            </Button>
          </div>
        </form>
        <ul className="mt-4 space-y-1 text-xs text-slate-500">
          <li><strong>Atendimento:</strong> pedidos, rastreio, clientes e mensagens.</li>
          <li><strong>Gerente:</strong> + catálogo, estoque, cupons, frete, banners, imagens e financeiro (leitura).</li>
          <li><strong>Administrador:</strong> acesso total, incluindo reembolsos, configurações, equipe, LGPD e auditoria.</li>
        </ul>
      </Panel>
      <DataTable
        rows={staff}
        rowKey={(s) => s.id}
        columns={[
          { header: "Nome", cell: (s) => <span className="font-medium">{s.name}</span> },
          { header: "E-mail", cell: (s) => s.email },
          { header: "Último login", cell: (s) => (s.lastLoginAt ? formatDateTime(s.lastLoginAt) : "—") },
          {
            header: "Papel",
            cell: (s) =>
              s.id === currentUserId ? (
                <span className="text-sm">{ROLE_LABELS[s.role]} (você)</span>
              ) : (
                <select
                  aria-label={`Papel de ${s.name}`}
                  defaultValue={s.role}
                  disabled={busy}
                  onChange={(e) => {
                    const next = e.target.value as Role;
                    if (!confirm(`Alterar papel de ${s.name} para ${ROLE_LABELS[next]}?`)) {
                      e.target.value = s.role;
                      return;
                    }
                    act(() => apiFetch(`/api/admin/staff/${s.id}`, { method: "PATCH", body: { role: next } }), "Papel atualizado");
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {r === "CUSTOMER" ? "Remover acesso (cliente)" : ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              ),
          },
        ]}
      />
    </div>
  );
}
