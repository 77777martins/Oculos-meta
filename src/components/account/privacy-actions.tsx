"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";

export function PrivacyActions() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function deleteAccount() {
    setBusy(true);
    try {
      await apiFetch("/api/account/delete", { body: { password, confirm } });
      toast.success("Conta excluída", "Seus dados pessoais foram removidos.");
      router.replace("/");
      router.refresh();
    } catch (e) {
      toast.error("Não foi possível excluir a conta", (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-100 p-6 sm:p-8">
        <h3 className="font-semibold">Baixar meus dados</h3>
        <p className="mt-1 text-sm text-slate-600">Receba uma cópia, em formato JSON, dos dados pessoais que mantemos sobre você (LGPD, art. 18).</p>
        <a href="/api/account/export" className={buttonClasses("outline", "md", "mt-4")} download>
          <Download className="size-4" aria-hidden /> Exportar dados
        </a>
      </section>
      <section className="rounded-3xl border border-red-100 bg-red-50/40 p-6 sm:p-8">
        <h3 className="font-semibold text-red-800">Excluir minha conta</h3>
        <p className="mt-1 text-sm text-slate-700">
          Seus dados pessoais (nome, e-mail, telefone, endereços e favoritos) serão removidos ou anonimizados. Registros de pedidos são mantidos de forma anonimizada pelo prazo exigido pela legislação fiscal. Esta
          ação é irreversível.
        </p>
        {!confirming ? (
          <Button variant="danger" className="mt-4" onClick={() => setConfirming(true)} icon={<Trash2 className="size-4" />}>
            Quero excluir minha conta
          </Button>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Sua senha" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label='Digite "EXCLUIR" para confirmar' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div className="flex gap-2 sm:col-span-2">
              <Button variant="danger" onClick={deleteAccount} loading={busy} disabled={!password || confirm !== "EXCLUIR"}>
                Excluir definitivamente
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
