"use client";

import { useRef, useState } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/http/client";

/**
 * A Public Key do Mercado Pago é PÚBLICA por design (só tokeniza cartões).
 * Inicialização única no escopo do módulo e apenas no navegador — padrão oficial do SDK.
 */
const PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";
if (PUBLIC_KEY && typeof window !== "undefined") initMercadoPago(PUBLIC_KEY, { locale: "pt-BR" });

interface Props {
  orderId: string;
  amountCents: number;
  maxInstallments: number;
  payerEmail: string;
  onResult: (status: string, detail?: string | null) => void;
}

/**
 * Card Payment Brick: os dados do cartão são digitados em campos seguros do
 * Mercado Pago e convertidos em um TOKEN de uso único. Nosso servidor recebe
 * apenas o token — nunca número, validade ou CVV (escopo PCI reduzido).
 */
export function CardPaymentForm({ orderId, amountCents, maxInstallments, payerEmail, onResult }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Chave de idempotência por tentativa: reenvios da MESMA tentativa não geram nova cobrança.
  const attemptRef = useRef<string>(crypto.randomUUID());

  if (!PUBLIC_KEY) {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800" role="alert">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        Pagamento com cartão indisponível no momento (integração não configurada). Utilize o PIX.
      </p>
    );
  }

  return (
    <div>
      {!ready && (
        <div className="space-y-3" role="status" aria-label="Carregando formulário de cartão">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      )}
      {error && (
        <p className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <CardPayment
        initialization={{ amount: amountCents / 100, payer: { email: payerEmail } }}
        customization={{ paymentMethods: { maxInstallments, minInstallments: 1 }, visual: { style: { theme: "default" } } }}
        locale="pt-BR"
        onReady={() => setReady(true)}
        onError={() => setError("Não foi possível carregar o formulário de cartão. Recarregue a página ou use PIX.")}
        onSubmit={async (formData) => {
          setError(null);
          try {
            const result = await apiFetch<{ status: string; statusDetail: string | null }>(`/api/orders/${orderId}/payments`, {
              body: {
                method: "card",
                attemptId: attemptRef.current,
                token: formData.token,
                paymentMethodId: formData.payment_method_id,
                issuerId: formData.issuer_id || null,
                installments: Number(formData.installments),
                payerEmail: formData.payer.email ?? payerEmail,
                identificationType: formData.payer.identification?.type === "CNPJ" ? "CNPJ" : "CPF",
                identificationNumber: formData.payer.identification?.number?.replace(/\D/g, "") || undefined,
              },
            });
            if (result.status === "REJECTED") attemptRef.current = crypto.randomUUID(); // nova tentativa permitida
            onResult(result.status, result.statusDetail);
          } catch (e) {
            attemptRef.current = crypto.randomUUID();
            setError((e as Error).message);
            throw e; // informa o Brick que o envio falhou
          }
        }}
      />
    </div>
  );
}
