import { requirePermissionPage } from "@/lib/auth/guards";
import { AdminHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { getStoreSettings } from "@/server/services/settings";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  await requirePermissionPage("settings:write");
  const settings = await getStoreSettings();
  const s = Object.fromEntries(Object.entries(settings).filter(([k]) => k !== "id" && k !== "updatedAt")) as Omit<typeof settings, "id" | "updatedAt">;
  return (
    <>
      <AdminHeader title="Configurações da loja" />
      <SettingsForm initial={s} />
    </>
  );
}
