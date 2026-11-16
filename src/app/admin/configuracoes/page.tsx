import { requirePermissionPage } from "@/lib/auth/guards";
import { AdminHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { getStoreSettings } from "@/server/services/settings";
import { MelhorEnvioPanel } from "@/components/admin/melhor-envio-panel";
import { callbackUrl, getConnectionStatus } from "@/server/shipping/melhor-envio";

export const metadata = { title: "Configurações" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ me?: string }> }) {
  await requirePermissionPage("settings:write");
  const { me } = await searchParams;
  const status = await getConnectionStatus();
  const settings = await getStoreSettings();
  const s = Object.fromEntries(Object.entries(settings).filter(([k]) => k !== "id" && k !== "updatedAt")) as Omit<typeof settings, "id" | "updatedAt">;
  return (
    <>
      <AdminHeader title="Configurações da loja" />
      <SettingsForm
        initial={s}
        integrationPanel={<MelhorEnvioPanel status={{ ...status, expiresAt: status.expiresAt?.toISOString() ?? null }} callbackUrl={callbackUrl()} result={me} />}
      />
    </>
  );
}
