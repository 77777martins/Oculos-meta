import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, DataTable } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "LGPD" };

export default async function PrivacyAdminPage() {
  await requirePermissionPage("privacy:manage");
  const [requests, consents] = await Promise.all([
    db.dataRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { email: true, anonymizedAt: true } } } }),
    db.consentRecord.groupBy({ by: ["type", "granted"], _count: true }),
  ]);
  return (
    <>
      <AdminHeader title="LGPD — solicitações de titulares" description="Exportações e exclusões são atendidas automaticamente pela área do cliente e registradas aqui." />
      <div className="mb-6 flex flex-wrap gap-2">
        {consents.map((c) => (
          <Badge key={`${c.type}-${c.granted}`} tone={c.granted ? "success" : "neutral"}>
            {c.type}: {c.granted ? "concedido" : "recusado"} ({c._count})
          </Badge>
        ))}
      </div>
      <DataTable
        rows={requests}
        rowKey={(r) => r.id}
        columns={[
          { header: "Data", cell: (r) => formatDateTime(r.createdAt) },
          { header: "Tipo", cell: (r) => (r.type === "ACCESS" ? "Acesso / portabilidade" : "Exclusão") },
          { header: "Titular", cell: (r) => (r.user.anonymizedAt ? "(anonimizado)" : r.user.email) },
          { header: "Status", cell: (r) => <Badge tone={r.status === "COMPLETED" ? "success" : "warning"}>{r.status}</Badge> },
          { header: "Observação", cell: (r) => r.notes ?? "—" },
        ]}
      />
    </>
  );
}
