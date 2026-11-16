import type { Metadata } from "next";
import { PageHero, PolicyText } from "@/components/store/policy-text";
import { DEFAULT_TERMS } from "@/server/services/default-content";
import { getStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Termos de Uso", alternates: { canonical: "/termos-de-uso" } };

export default async function TermsPage() {
  const s = await getStoreSettings();
  return (
    <>
      <PageHero title="Termos de Uso" />
      <div className="container-page max-w-3xl py-12">
        <PolicyText text={s.termsOfUse ?? DEFAULT_TERMS} />
      </div>
    </>
  );
}
