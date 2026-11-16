import type { Metadata } from "next";
import { ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHero, PolicyText } from "@/components/store/policy-text";
import { DEFAULT_ABOUT } from "@/server/services/default-content";
import { getStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Sobre nós", alternates: { canonical: "/sobre" } };

export default async function AboutPage() {
  const s = await getStoreSettings();
  return (
    <>
      <PageHero eyebrow="Institucional" title={`Sobre a ${s.storeName}`} />
      <div className="container-page grid gap-12 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PolicyText text={s.aboutText ?? DEFAULT_ABOUT} />
          <ButtonLink href="/produtos" className="mt-8">
            Conheça os modelos
          </ButtonLink>
        </div>
        <ul className="space-y-4">
          {[
            [Sparkles, "Curadoria", "Selecionamos modelos com procedência e suporte."],
            [ShieldCheck, "Segurança", "Pagamento validado no servidor e dados protegidos."],
            [Truck, "Entrega rastreada", "Acompanhe tudo pela sua conta."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Sparkles;
            return (
              <li key={title as string} className="rounded-3xl border border-slate-100 bg-surface p-6">
                <I className="size-5 text-brand-600" aria-hidden />
                <p className="mt-3 font-semibold">{title as string}</p>
                <p className="mt-1 text-sm text-slate-600">{text as string}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
