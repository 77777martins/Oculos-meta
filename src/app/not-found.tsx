import Link from "next/link";
import { VisioMark } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <VisioMark className="size-20 text-ink" />
      <p className="mt-8 font-display text-7xl font-semibold text-ink">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-slate-600">O endereço pode ter mudado ou o produto não está mais disponível.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Ir para o início</ButtonLink>
        <ButtonLink href="/produtos" variant="outline">
          Ver produtos
        </ButtonLink>
      </div>
      <Link href="/contato" className="mt-6 text-sm text-brand-700 hover:underline">
        Precisa de ajuda?
      </Link>
    </main>
  );
}
