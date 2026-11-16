import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/store/contact-form";
import { PageHero } from "@/components/store/policy-text";
import { getStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Contato", alternates: { canonical: "/contato" } };

export default async function ContactPage() {
  const s = await getStoreSettings();
  const whatsappDigits = s.whatsapp?.replace(/\D/g, "");
  return (
    <>
      <PageHero eyebrow="Atendimento" title="Fale conosco" description="Dúvidas sobre modelos, pedidos ou entregas? Estamos aqui para ajudar." />
      <div className="container-page grid gap-12 py-12 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 p-6 sm:p-8 lg:col-span-2">
          <ContactForm />
        </div>
        <ul className="space-y-4 text-sm">
          {s.contactEmail && (
            <li className="flex gap-3">
              <Mail className="size-5 text-brand-600" aria-hidden />
              <a href={`mailto:${s.contactEmail}`} className="hover:underline">
                {s.contactEmail}
              </a>
            </li>
          )}
          {s.contactPhone && (
            <li className="flex gap-3">
              <Phone className="size-5 text-brand-600" aria-hidden /> {s.contactPhone}
            </li>
          )}
          {whatsappDigits && (
            <li className="flex gap-3">
              <Phone className="size-5 text-emerald-600" aria-hidden />
              <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                WhatsApp {s.whatsapp}
              </a>
            </li>
          )}
          {s.businessHours && (
            <li className="flex gap-3">
              <Clock className="size-5 text-brand-600" aria-hidden /> {s.businessHours}
            </li>
          )}
          {s.address && (
            <li className="flex gap-3">
              <MapPin className="size-5 text-brand-600" aria-hidden /> {s.address}
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
