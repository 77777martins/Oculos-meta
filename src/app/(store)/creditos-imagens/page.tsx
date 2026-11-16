import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/store/policy-text";
import { getImageCredits } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Créditos das imagens", alternates: { canonical: "/creditos-imagens" } };

/** Atribuição das imagens usadas sob licenças livres (exigência das licenças Creative Commons). */
export default async function ImageCreditsPage() {
  const credits = await getImageCredits();
  return (
    <>
      <PageHero title="Créditos das imagens" description="Algumas fotos de produtos são usadas sob licenças livres. Agradecemos aos autores." />
      <div className="container-page max-w-3xl py-12">
        {credits.length === 0 ? (
          <p className="text-slate-600">No momento não há imagens de terceiros em uso.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-100">
            {credits.map((c) => (
              <li key={c.id} className="flex items-center gap-4 p-4 text-sm">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                  <Image src={c.url} alt={c.alt} fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <Link href={`/produtos/${c.product.slug}`} className="font-semibold hover:text-brand-700">
                    {c.product.name}
                  </Link>
                  <p className="text-slate-600">
                    {c.credit}
                    {c.creditUrl && (
                      <>
                        {" · "}
                        <a href={c.creditUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                          origem e licença
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
