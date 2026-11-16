import type { Metadata } from "next";
import { PageHero, PolicyText } from "@/components/store/policy-text";
import { DEFAULT_PRIVACY } from "@/server/services/default-content";
import { getStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Política de Privacidade", alternates: { canonical: "/politica-de-privacidade" } };

export default async function PrivacyPolicyPage() {
  const s = await getStoreSettings();
  return (
    <>
      <PageHero eyebrow="LGPD" title="Política de Privacidade" description="Como coletamos, usamos e protegemos seus dados pessoais." />
      <div className="container-page max-w-3xl py-12">
        <PolicyText text={s.privacyPolicy ?? DEFAULT_PRIVACY} />
        {s.contactEmail && <p className="mt-10 text-sm text-slate-600">Encarregado de dados (DPO) / contato: {s.contactEmail}</p>}
      </div>
    </>
  );
}
