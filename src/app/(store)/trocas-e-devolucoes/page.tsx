import type { Metadata } from "next";
import { PageHero, PolicyText } from "@/components/store/policy-text";
import { DEFAULT_RETURNS } from "@/server/services/default-content";
import { getStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Trocas e Devoluções", alternates: { canonical: "/trocas-e-devolucoes" } };

export default async function ReturnsPage() {
  const s = await getStoreSettings();
  return (
    <>
      <PageHero title="Trocas e Devoluções" description="Transparência do pedido à entrega — e depois dela." />
      <div className="container-page max-w-3xl py-12">
        <PolicyText text={s.returnPolicy ?? DEFAULT_RETURNS} />
      </div>
    </>
  );
}
