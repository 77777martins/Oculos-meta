import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { env } from "@/lib/env";
import { getStoreSettings } from "@/server/services/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <>
      {env().DEMO_MODE && <DemoBanner />}
      <Header />
      <main id="conteudo" className="min-h-[60vh] pb-24 has-[>.page-gray]:bg-slate-100">
        {children}
      </main>
      <Footer />
      {settings.whatsapp && <WhatsAppButton phone={settings.whatsapp} storeName={settings.storeName} />}
    </>
  );
}
