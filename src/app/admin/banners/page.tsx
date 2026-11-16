import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { BannerManager } from "@/components/admin/managers";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  await requirePermissionPage("banners:write");
  const rows = await db.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <AdminHeader title="Banners" />
      <BannerManager rows={rows} />
    </>
  );
}
