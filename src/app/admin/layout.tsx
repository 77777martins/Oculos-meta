import type { Metadata } from "next";
import { requirePermissionPage } from "@/lib/auth/guards";
import { PERMISSIONS, ROLE_LABELS, hasPermission } from "@/lib/auth/rbac";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Painel administrativo", template: "%s | Admin" }, robots: { index: false, follow: false } };

/** Toda a árvore /admin exige papel de equipe (verificado no servidor a cada requisição). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermissionPage("admin:access", "/admin");
  const permissions = PERMISSIONS.filter((p) => hasPermission(user.role, p));
  return (
    <AdminShell permissions={permissions} user={{ name: user.name, roleLabel: ROLE_LABELS[user.role] }}>
      {children}
    </AdminShell>
  );
}
