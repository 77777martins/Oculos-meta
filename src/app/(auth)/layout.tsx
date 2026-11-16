import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { GlassesArt } from "@/components/ui/glasses-art";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <main id="conteudo" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </main>
        <p className="text-center text-xs text-slate-500">
          <Link href="/politica-de-privacidade" className="hover:text-ink">
            Privacidade
          </Link>{" "}
          ·{" "}
          <Link href="/termos-de-uso" className="hover:text-ink">
            Termos
          </Link>{" "}
          ·{" "}
          <Link href="/contato" className="hover:text-ink">
            Ajuda
          </Link>
        </p>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgb(59_102_245/0.5),transparent_70%)]" />
        <div className="relative max-w-md p-12 text-white">
          <GlassesArt tone="light" />
          <p className="mt-10 font-display text-3xl font-semibold leading-tight">Tecnologia e estilo, com a segurança que você merece.</p>
          <p className="mt-4 text-slate-300">Acompanhe pedidos, salve favoritos e finalize compras em segundos.</p>
        </div>
      </div>
    </div>
  );
}
