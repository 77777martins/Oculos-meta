"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Link2, Unlink } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { formatDateTime } from "@/lib/utils";

interface Status {
  configured: boolean;
  connected: boolean;
  environment: string;
  expiresAt: string | null;
  environmentMismatch: boolean;
}

const MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> = {
  conectado: { tone: "ok", text: "Melhor Envio conectado com sucesso." },
  "estado-invalido": { tone: "error", text: "Falha de segurança na autorização (state inválido ou expirado). Tente conectar novamente." },
  negado: { tone: "error", text: "A autorização foi negada ou cancelada no Melhor Envio." },
  erro: { tone: "error", text: "Não foi possível concluir a conexão. Confira Client ID, Secret e a URL de callback do aplicativo." },
  "nao-configurado": { tone: "error", text: "Configure MELHORENVIO_CLIENT_ID, MELHORENVIO_CLIENT_SECRET e MELHORENVIO_USER_AGENT no servidor." },
};

export function MelhorEnvioPanel({ status, callbackUrl, result }: { status: Status; callbackUrl: string; result?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const message = result ? MESSAGES[result] : undefined;

  async function disconnect() {
    if (!confirm("Desconectar o Melhor Envio? A loja voltará a usar a tabela de frete por CEP.")) return;
    setBusy(true);
    try {
      await apiFetch("/api/admin/integrations/melhor-envio", { method: "DELETE" });
      toast.success("Melhor Envio desconectado");
      router.refresh();
    } catch (e) {
      toast.error("Erro", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      {message && <p className={`rounded-xl p-3 ${message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{message.text}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            {status.connected ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <Unlink className="size-4 text-slate-400" aria-hidden />}
            {status.connected ? "Conectado" : "Não conectado"} <span className="font-normal text-slate-500">· ambiente {status.environment}</span>
          </p>
          {status.connected && status.expiresAt && <p className="mt-1 text-xs text-slate-500">Token renovado automaticamente · válido até {formatDateTime(status.expiresAt)}</p>}
          {status.environmentMismatch && <p className="mt-1 text-xs text-amber-700">A conexão salva é de outro ambiente. Conecte novamente.</p>}
          {!status.configured && <p className="mt-1 text-xs text-amber-700">Credenciais do aplicativo ausentes no servidor (veja docs/DEPLOY.md).</p>}
        </div>
        {status.connected ? (
          <Button variant="outline" size="sm" loading={busy} onClick={disconnect} icon={<Unlink className="size-4" />}>
            Desconectar
          </Button>
        ) : (
          // Navegação de página inteira: o fluxo OAuth redireciona para o Melhor Envio.
          <a href="/api/admin/integrations/melhor-envio/connect" className={buttonClasses("dark", "sm", status.configured ? "" : "pointer-events-none opacity-50")} aria-disabled={!status.configured}>
            <Link2 className="size-4" aria-hidden /> Conectar Melhor Envio
          </a>
        )}
      </div>
      <p className="text-xs text-slate-500">
        URL de callback para cadastrar no aplicativo: <code className="rounded bg-slate-100 px-1.5 py-0.5">{callbackUrl}</code>
      </p>
    </div>
  );
}
