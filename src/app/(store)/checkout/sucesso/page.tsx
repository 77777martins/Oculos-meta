import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatBRL } from "@/lib/money";
import { idSchema } from "@/lib/validation/common";
import { ButtonLink } from "@/components/ui/button";
import { ResultCard } from "@/components/checkout/result-card";

export const metadata: Metadata = { title: "Pagamento aprovado", robots: { index: false } };

/** Exibe "aprovado" SOMENTE se o banco confirmar — o parâmetro da URL não é confiável. */
export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const user = await requireUserPage("/conta/pedidos");
  const id = idSchema.safeParse(pedido);
  if (!id.success) redirect("/conta/pedidos");
  const order = await db.order.findFirst({ where: { id: id.data, userId: user.id }, select: { id: true, number: true, status: true, totalCents: true, shippingMinDays: true, shippingMaxDays: true } });
  if (!order) redirect("/conta/pedidos");
  if (order.status === "PENDING_PAYMENT") redirect(`/checkout/pendente?pedido=${order.id}`);
  if (!["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) redirect(`/conta/pedidos/${order.id}`);

  return (
    <ResultCard
      tone="success"
      icon={<CheckCircle2 className="size-8" />}
      title="Pagamento aprovado!"
      actions={
        <>
          <ButtonLink href={`/conta/pedidos/${order.id}`}>Acompanhar pedido</ButtonLink>
          <ButtonLink href="/produtos" variant="outline">
            Continuar comprando
          </ButtonLink>
        </>
      }
    >
      <p>
        Recebemos o pagamento do pedido <strong className="text-ink">#{order.number}</strong> no valor de <strong className="text-ink">{formatBRL(order.totalCents)}</strong>.
      </p>
      {order.shippingMinDays !== null && (
        <p className="mt-2">
          Prazo estimado de entrega: {order.shippingMinDays}–{order.shippingMaxDays} dias úteis. Você receberá o código de rastreio assim que o pedido for enviado.
        </p>
      )}
    </ResultCard>
  );
}
