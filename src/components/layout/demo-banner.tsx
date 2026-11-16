import { TriangleAlert } from "lucide-react";

/** Aviso exibido em implantações de demonstração (DEMO_MODE=true). */
export function DemoBanner() {
  return (
    <div role="note" className="bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950">
      <TriangleAlert className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />
      Loja de demonstração — produtos e preços fictícios. Não realize compras nem informe dados reais.
    </div>
  );
}
