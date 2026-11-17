import { MessageCircle } from "lucide-react";

/** Atalho flutuante para o WhatsApp da loja. Só aparece quando o número está nas Configurações. */
export function WhatsAppButton({ phone, storeName }: { phone: string; storeName: string }) {
  const digits = phone.replace(/\D/g, "");
  // Número brasileiro sem DDI recebe o 55; abaixo de 10 dígitos o número é inválido.
  const full = digits.length <= 11 ? `55${digits}` : digits;
  if (full.length < 12 || full.length > 15) return null;
  const text = encodeURIComponent(`Olá! Vim pelo site da ${storeName} e tenho uma dúvida.`);
  return (
    <a
      href={`https://wa.me/${full}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a loja pelo WhatsApp"
      className="fixed bottom-24 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] lg:bottom-6 lg:right-6"
    >
      <MessageCircle className="size-7" aria-hidden />
    </a>
  );
}
