import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { env } from "@/lib/env";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {env().DEMO_MODE && <DemoBanner />}
      <Header />
      <main id="conteudo" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
    </>
  );
}
