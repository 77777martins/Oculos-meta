import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { idSchema } from "@/lib/validation/common";
import { ButtonLink } from "@/components/ui/button";
import { ResultCard } from "@/components/checkout/result-card";

export const metadata: Metadata = { title: "Pagamento pendente", robots: { index: false } };

export default async function PendingPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const user = await requireUserPage("/conta/pedidos");
  const id = idSchema.safeParse(pedido);
  if (!id.success) redirect("/conta/pedidos");
  const order = await db.order.findFirst({ where: { id: id.data, userId: user.id }, select: { id: true, number: true, status: true } });
  if (!order) redirect("/conta/pedidos");
  if (order.status !== "PENDING_PAYMENT") redirect(`/checkout/sucesso?pedido=${order.id}`);

  return (
    <ResultCard
      tone="warning"
      icon={<Clock className="size-8" />}
      title="Pagamento em processamento"
      actions={
        <>
          <ButtonLink href={`/checkout/pagamento/${order.id}`}>Ver pagamento</ButtonLink>
          <ButtonLink href={`/conta/pedidos/${order.id}`} variant="outline">
            Detalhes do pedido
          </ButtonLink>
        </>
      }
    >
      <p>
        O pagamento do pedido <strong className="text-ink">#{order.number}</strong> está pendente ou em análise pelo Mercado Pago. Assim que for confirmado, atualizaremos seu pedido automaticamente e você
        receberá um e-mail.
      </p>
    </ResultCard>
  );
}
