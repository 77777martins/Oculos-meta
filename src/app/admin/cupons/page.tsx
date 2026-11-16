import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { CouponManager } from "@/components/admin/managers";

export const metadata = { title: "Cupons" };

export default async function CouponsPage() {
  await requirePermissionPage("coupons:write");
  const rows = await db.coupon.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { _count: { select: { redemptions: true } } } });
  return (
    <>
      <AdminHeader title="Cupons" description="Usos são contabilizados por pedido; pedidos expirados liberam o uso." />
      <CouponManager rows={rows.map(({ _count, ...c }) => ({ ...c, redemptionCount: _count.redemptions }))} />
    </>
  );
}
