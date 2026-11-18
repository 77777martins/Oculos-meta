"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

/** Página 500: mensagem amigável, sem detalhes técnicos (o digest ajuda o suporte a localizar o log). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main id="conteudo" className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <AlertTriangle className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 max-w-md text-slate-600">Tivemos um problema ao carregar esta página. Tente novamente — se persistir, fale com nosso atendimento.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Código: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <ButtonLink href="/" variant="outline">
          Início
        </ButtonLink>
      </div>
    </main>
  );
}
