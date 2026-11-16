import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { MarkHandledButton } from "@/components/admin/mark-handled-button";

export const metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  await requirePermissionPage("messages:read");
  const messages = await db.contactMessage.findMany({ orderBy: [{ handledAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }], take: 100 });
  return (
    <>
      <AdminHeader title="Mensagens de contato" description="Responda pelo e-mail do cliente." />
      <div className="space-y-4">
        {messages.length === 0 && <p className="text-sm text-slate-500">Nenhuma mensagem.</p>}
        {messages.map((m) => (
          <Panel key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{m.subject}</p>
                <p className="text-sm text-slate-500">
                  {m.name} · <a className="text-brand-700 hover:underline" href={`mailto:${m.email}`}>{m.email}</a> · {formatDateTime(m.createdAt)}
                </p>
              </div>
              {m.handledAt ? <Badge tone="success">Tratada</Badge> : <MarkHandledButton id={m.id} />}
            </div>
            {/* Texto do cliente exibido como texto puro (escapado pelo React). */}
            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{m.message}</p>
          </Panel>
        ))}
      </div>
    </>
  );
}
