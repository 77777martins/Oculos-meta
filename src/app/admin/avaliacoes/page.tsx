import Link from "next/link";
import { requirePermissionPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { ReviewActions } from "@/components/admin/review-actions";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/stars";
import { listReviewsForModeration } from "@/server/services/reviews";

export const metadata = { title: "Avaliações" };

const STATUS = { PENDING: ["Pendente", "warning"], PUBLISHED: ["Publicada", "success"], REJECTED: ["Recusada", "neutral"] } as const;

export default async function ReviewsPage() {
  await requirePermissionPage("products:write");
  const reviews = await listReviewsForModeration();
  return (
    <>
      <AdminHeader title="Avaliações de clientes" description="Só clientes com pedido entregue avaliam. Nada aparece na loja antes de você publicar." />
      <div className="space-y-4">
        {reviews.length === 0 && <p className="text-sm text-slate-500">Nenhuma avaliação recebida ainda.</p>}
        {reviews.map((r) => {
          const [label, tone] = STATUS[r.status];
          return (
            <Panel key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    <Link href={`/produtos/${r.product.slug}`} className="font-medium text-brand-700 hover:underline">
                      {r.product.name}
                    </Link>{" "}
                    · {r.user.name} ({r.user.email}) · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <ReviewActions id={r.id} status={r.status} />
              </div>
              {/* Texto do cliente como texto puro (escapado pelo React). */}
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
