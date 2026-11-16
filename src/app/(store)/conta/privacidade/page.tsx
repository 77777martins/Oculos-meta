import Link from "next/link";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/utils";
import { PrivacyActions } from "@/components/account/privacy-actions";

export const metadata = { title: "Privacidade e dados" };

const LABELS = { TERMS: "Termos de uso", PRIVACY: "Política de privacidade", COOKIES_ANALYTICS: "Cookies de análise", MARKETING: "Comunicações de marketing" } as const;

export default async function PrivacyPage() {
  const user = await requireUserPage("/conta/privacidade");
  const consents = await db.consentRecord.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, granted: true, version: true, createdAt: true } });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Privacidade e dados</h2>
        <p className="mt-1 text-sm text-slate-600">
          Você controla seus dados. Saiba mais na nossa{" "}
          <Link href="/politica-de-privacidade" className="font-semibold text-brand-700 hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
      <section className="rounded-3xl border border-slate-100 p-6 sm:p-8">
        <h3 className="font-semibold">Seus consentimentos</h3>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {consents.map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2.5">
              <span>
                {LABELS[c.type]} <span className="text-slate-400">(v{c.version})</span>
              </span>
              <span className={c.granted ? "text-emerald-700" : "text-slate-500"}>
                {c.granted ? "Concedido" : "Recusado"} · {formatDateTime(c.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <PrivacyActions />
    </div>
  );
}
