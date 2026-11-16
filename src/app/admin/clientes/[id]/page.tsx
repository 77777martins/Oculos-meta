import { notFound } from "next/navigation";
import { requirePermissionPage } from "@/lib/auth/guards";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { formatDateTime, formatZip } from "@/lib/utils";
import { idSchema } from "@/lib/validation/common";
import { AdminHeader, DataTable, Panel } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/ui/status-badge";

export const metadata = { title: "Cliente" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermissionPage("customers:read");
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  // Seleção explícita: hash de senha e dados de segurança nunca chegam à página.
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      lockedUntil: true,
      anonymizedAt: true,
      addresses: { where: { deletedAt: null }, select: { id: true, recipient: true, street: true, number: true, city: true, state: true, zipCode: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, number: true, status: true, totalCents: true, createdAt: true } },
    },
  });
  if (!user) notFound();
  const spent = user.orders.filter((o) => ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status)).reduce((a, o) => a + o.totalCents, 0);
  return (
    <>
      <AdminHeader title={user.name} description={`${user.email} · ${ROLE_LABELS[user.role]}${user.anonymizedAt ? " · ANONIMIZADO" : ""}`} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Resumo">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Telefone</dt><dd>{user.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Cadastro</dt><dd>{formatDateTime(user.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Último login</dt><dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Total pago</dt><dd className="font-semibold">{formatBRL(spent)}</dd></div>
            {user.lockedUntil && user.lockedUntil > new Date() && <p className="rounded-lg bg-amber-50 p-2 text-amber-800">Conta bloqueada temporariamente por tentativas de login.</p>}
          </dl>
        </Panel>
        <Panel title="Endereços" className="xl:col-span-2">
          <ul className="space-y-2 text-sm">
            {user.addresses.length === 0 && <li className="text-slate-500">Nenhum endereço.</li>}
            {user.addresses.map((a) => (
              <li key={a.id}>{a.recipient} — {a.street}, {a.number} · {a.city}/{a.state} · {formatZip(a.zipCode)}</li>
            ))}
          </ul>
        </Panel>
      </div>
      <h2 className="mb-4 mt-8 text-lg font-semibold">Pedidos</h2>
      <DataTable
        rows={user.orders}
        rowKey={(o) => o.id}
        rowHref={(o) => `/admin/pedidos/${o.id}`}
        columns={[
          { header: "Pedido", cell: (o) => `#${o.number}` },
          { header: "Data", cell: (o) => formatDateTime(o.createdAt) },
          { header: "Status", cell: (o) => <OrderStatusBadge status={o.status} /> },
          { header: "Total", className: "text-right", cell: (o) => formatBRL(o.totalCents) },
        ]}
      />
    </>
  );
}
