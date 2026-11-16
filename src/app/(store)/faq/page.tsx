import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/store/policy-text";
import { FAQ } from "@/server/services/default-content";

export const metadata: Metadata = { title: "Perguntas frequentes", alternates: { canonical: "/faq" } };

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero eyebrow="Ajuda" title="Perguntas frequentes" description="Respostas rápidas sobre pagamento, entrega e segurança." />
      <div className="container-page max-w-3xl py-12">
        <div className="divide-y divide-slate-100 rounded-3xl border border-slate-100">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 leading-7 text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-surface p-8 text-center">
          <p className="font-semibold">Não encontrou sua resposta?</p>
          <ButtonLink href="/contato" className="mt-4">
            Fale com a gente
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
