import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { StaffManager } from "@/components/admin/staff-manager";

export const metadata = { title: "Equipe" };

export default async function StaffPage() {
  const user = await requirePermissionPage("staff:manage");
  const staff = await db.user.findMany({ where: { role: { not: "CUSTOMER" }, anonymizedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, lastLoginAt: true } });
  return (
    <>
      <AdminHeader title="Equipe administrativa" description="Ao mudar um papel, as sessões da pessoa são encerradas." />
      <StaffManager staff={staff} currentUserId={user.id} />
    </>
  );
}
