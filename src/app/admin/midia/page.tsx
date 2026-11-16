import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata = { title: "Imagens" };

export default async function MediaPage() {
  await requirePermissionPage("media:write");
  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, url: true, alt: true, sizeBytes: true } });
  return (
    <>
      <AdminHeader title="Imagens" description="JPG, PNG, WEBP ou AVIF até 5 MB. Use apenas imagens próprias, oficiais autorizadas ou licenciadas." />
      <MediaLibrary assets={assets} />
    </>
  );
}
