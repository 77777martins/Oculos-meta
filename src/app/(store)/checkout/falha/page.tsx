import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { idSchema } from "@/lib/validation/common";
import { ButtonLink } from "@/components/ui/button";
import { ResultCard } from "@/components/checkout/result-card";

export const metadata: Metadata = { title: "Pagamento não aprovado", robots: { index: false } };

/** Mensagens amigáveis para os principais status_detail do Mercado Pago (lista fechada — nada da URL é exibido cru). */
const REASONS: Record<string, string> = {
  expirado: "O prazo para pagamento expirou e a reserva do estoque foi liberada.",
  cc_rejected_insufficient_amount: "O cartão não possui limite suficiente.",
  cc_rejected_bad_filled_security_code: "O código de segurança (CVV) está incorreto.",
  cc_rejected_bad_filled_date: "A data de validade do cartão está incorreta.",
  cc_rejected_bad_filled_other: "Revise os dados do cartão.",
  cc_rejected_call_for_authorize: "O banco emissor precisa autorizar o pagamento. Entre em contato com ele.",
  cc_rejected_card_disabled: "O cartão está desativado. Contate o banco emissor.",
  cc_rejected_duplicated_payment: "Já existe um pagamento idêntico recente.",
  cc_rejected_high_risk: "O pagamento foi recusado pela análise de segurança. Tente outro meio de pagamento.",
  cc_rejected_max_attempts: "Limite de tentativas atingido. Use outro cartão ou PIX.",
  cc_rejected_other_reason: "O banco emissor recusou o pagamento.",
};

export default async function FailurePage({ searchParams }: { searchParams: Promise<{ pedido?: string; motivo?: string }> }) {
  const { pedido, motivo } = await searchParams;
  const user = await requireUserPage("/conta/pedidos");
  const id = idSchema.safeParse(pedido);
  const order = id.success ? await db.order.findFirst({ where: { id: id.data, userId: user.id }, select: { id: true, number: true, status: true } }) : null;
  const canRetry = order?.status === "PENDING_PAYMENT";

  return (
    <ResultCard
      tone="danger"
      icon={<XCircle className="size-8" />}
      title="Pagamento não aprovado"
      actions={
        canRetry ? (
          <>
            <ButtonLink href={`/checkout/pagamento/${order!.id}`}>Tentar novamente</ButtonLink>
            <ButtonLink href="/contato" variant="outline">
              Falar com o atendimento
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink href="/carrinho">Voltar ao carrinho</ButtonLink>
            <ButtonLink href="/produtos" variant="outline">
              Ver produtos
            </ButtonLink>
          </>
        )
      }
    >
      <p>{(motivo && REASONS[motivo]) ?? "Não foi possível concluir o pagamento. Nenhum valor foi cobrado."}</p>
      {canRetry && <p className="mt-2">Seu pedido #{order!.number} continua reservado por alguns minutos — você pode tentar com outro cartão ou pagar com PIX.</p>}
    </ResultCard>
  );
}
