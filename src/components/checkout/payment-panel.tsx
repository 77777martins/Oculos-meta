"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Barcode, Check, Copy, CreditCard, ExternalLink, QrCode, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CardPaymentForm } from "./card-payment-form";

interface PixData {
  id: string;
  status: string;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  expiresAt: string | null;
}

interface BoletoData {
  id: string;
  ticketUrl: string | null;
  boletoLine: string | null;
  expiresAt: string | null;
}

interface Props {
  orderId: string;
  orderNumber: number;
  totalCents: number;
  reservationExpiresAt: string | null;
  existingPix: PixData | null;
  existingBoleto: BoletoData | null;
  boletoEnabled: boolean;
  maxInstallments: number;
  payerEmail: string;
}

export function PaymentPanel(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState<"pix" | "card" | "boleto">(props.existingBoleto && !props.existingPix ? "boleto" : "pix");
  const [boleto, setBoleto] = useState<BoletoData | null>(props.existingBoleto);
  const [pix, setPix] = useState<PixData | null>(props.existingPix);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const redirected = useRef(false);

  const goTo = useCallback(
    (path: string) => {
      if (redirected.current) return;
      redirected.current = true;
      router.replace(path);
    },
    [router],
  );

  // Consulta periódica de status — a confirmação vem do servidor/provedor, nunca do navegador.
  const awaiting = Boolean(pix || boleto);
  useEffect(() => {
    if (!awaiting) return;
    let stopped = false;
    const poll = async () => {
      try {
        const s = await apiFetch<{ orderStatus: string }>(`/api/orders/${props.orderId}/payment-status`);
        if (stopped) return;
        if (s.orderStatus !== "PENDING_PAYMENT") {
          goTo(s.orderStatus === "EXPIRED" || s.orderStatus === "CANCELLED" ? `/checkout/falha?pedido=${props.orderId}&motivo=expirado` : `/checkout/sucesso?pedido=${props.orderId}`);
        }
      } catch {
        /* tenta novamente no próximo ciclo */
      }
    };
    const id = setInterval(poll, 5000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [awaiting, props.orderId, goTo]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const deadline = method === "boleto" ? (boleto?.expiresAt ?? null) : (pix?.expiresAt ?? props.reservationExpiresAt);
  const remainingMs = deadline ? new Date(deadline).getTime() - now : null;
  const expired = remainingMs !== null && remainingMs <= 0;

  async function generatePix() {
    setGenerating(true);
    try {
      const data = await apiFetch<PixData>(`/api/orders/${props.orderId}/payments`, { body: { method: "pix" } });
      setPix(data);
    } catch (e) {
      toast.error("Não foi possível gerar o PIX", (e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function generateBoleto() {
    setGenerating(true);
    try {
      setBoleto(await apiFetch<BoletoData>(`/api/orders/${props.orderId}/payments`, { body: { method: "boleto" } }));
    } catch (e) {
      toast.error("Não foi possível gerar o boleto", (e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function copyCode(value: string | null | undefined = pix?.pixQrCode, label = "Código PIX copiado!") {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar", "Selecione o código e copie manualmente.");
    }
  }

  return (
    <div className="rounded-3xl border border-slate-100 p-6 sm:p-8">
      <div className={`grid gap-2 rounded-full bg-slate-100 p-1 ${props.boletoEnabled ? "grid-cols-3" : "grid-cols-2"}`} role="tablist" aria-label="Forma de pagamento">
        {(
          [
            ["pix", "PIX", QrCode],
            ["card", "Cartão", CreditCard],
            ...(props.boletoEnabled ? ([["boleto", "Boleto", Barcode]] as const) : []),
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={method === value}
            onClick={() => setMethod(value)}
            className={cn("flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all", method === value ? "bg-white text-ink shadow-soft" : "text-slate-600 hover:text-ink")}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {remainingMs !== null && !expired && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
          <Timer className="size-4 text-brand-600" aria-hidden />
          {method === "boleto" ? "Boleto vence em" : "Reserva do estoque expira em"} <strong className="tabular-nums text-ink">{formatRemaining(remainingMs)}</strong>
        </p>
      )}
      {expired && <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-800">O prazo deste pedido expirou. Se você já pagou, aguarde a confirmação; caso contrário, faça um novo pedido.</p>}

      <div className="mt-8" role="tabpanel">
        {method === "pix" ? (
          !pix ? (
            <div className="text-center">
              <p className="text-slate-600">Pague {formatBRL(props.totalCents)} com PIX. A confirmação é automática, em poucos segundos.</p>
              <Button size="lg" className="mt-6" onClick={generatePix} loading={generating} disabled={expired} icon={<QrCode className="size-5" />}>
                Gerar QR Code PIX
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              {pix.pixQrCodeBase64 && (
                // eslint-disable-next-line @next/next/no-img-element -- imagem em data URI gerada pelo provedor
                <img src={`data:image/png;base64,${pix.pixQrCodeBase64}`} alt="QR Code PIX para pagamento" width={240} height={240} className="rounded-2xl border border-slate-100 p-2" />
              )}
              <ol className="mt-6 max-w-md space-y-1 text-left text-sm text-slate-600">
                <li>1. Abra o app do seu banco e escolha pagar com PIX.</li>
                <li>2. Escaneie o QR Code ou use o código “copia e cola”.</li>
                <li>3. Confirme o pagamento — esta página atualiza sozinha.</li>
              </ol>
              {pix.pixQrCode && (
                <div className="mt-6 w-full max-w-md">
                  <label htmlFor="pix-code" className="block text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    PIX copia e cola
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input id="pix-code" readOnly value={pix.pixQrCode} onFocus={(e) => e.currentTarget.select()} className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs" />
                    <Button onClick={() => copyCode()} variant={copied ? "secondary" : "dark"} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>
              )}
              <p className="mt-6 flex items-center gap-2 text-sm text-slate-500" role="status">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-brand-600" />
                </span>
                Aguardando confirmação do pagamento…
              </p>
            </div>
          )
        ) : method === "boleto" ? (
          !boleto ? (
            <div className="text-center">
              <p className="text-slate-600">
                Pague {formatBRL(props.totalCents)} com boleto em qualquer banco, lotérica ou app. A compensação pode levar até 2 dias úteis após o pagamento; o pedido é confirmado automaticamente.
              </p>
              <Button size="lg" className="mt-6" onClick={generateBoleto} loading={generating} disabled={expired} icon={<Barcode className="size-5" />}>
                Gerar boleto
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <p className="text-slate-600">Boleto gerado. Pague até o vencimento — após o prazo ele não poderá ser pago e a reserva será liberada.</p>
              {boleto.boletoLine && (
                <div className="mt-6 w-full max-w-md">
                  <label htmlFor="boleto-line" className="block text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Linha digitável
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input id="boleto-line" readOnly value={boleto.boletoLine} onFocus={(e) => e.currentTarget.select()} className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-xs" />
                    <Button onClick={() => copyCode(boleto.boletoLine, "Linha digitável copiada!")} variant={copied ? "secondary" : "dark"} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>
              )}
              {boleto.ticketUrl && (
                <a href={boleto.ticketUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                  Abrir boleto (PDF) <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
              <p className="mt-6 text-xs text-slate-500">Se preferir, você ainda pode pagar com PIX ou cartão — o boleto será cancelado automaticamente.</p>
            </div>
          )
        ) : (
          <CardPaymentForm
            orderId={props.orderId}
            amountCents={props.totalCents}
            maxInstallments={props.maxInstallments}
            payerEmail={props.payerEmail}
            onResult={(status, detail) => {
              if (status === "APPROVED") goTo(`/checkout/sucesso?pedido=${props.orderId}`);
              else if (status === "IN_PROCESS" || status === "PENDING") goTo(`/checkout/pendente?pedido=${props.orderId}`);
              else goTo(`/checkout/falha?pedido=${props.orderId}${detail ? `&motivo=${encodeURIComponent(detail)}` : ""}`);
            }}
          />
        )}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-emerald-600" aria-hidden /> Pagamento processado com segurança pelo Mercado Pago · Pedido #{props.orderNumber}
      </p>
    </div>
  );
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
