import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Fotos do catálogo que já vêm prontas no projeto (WebP 1200 px, ~20 KB): são servidas
 * direto do CDN, sem passar pelo otimizador de imagens — carregam na hora e não dependem
 * da cota/latência do otimizador. Uploads do painel continuam otimizados.
 */
export function isBundledImage(src: string): boolean {
  return src.startsWith("/images/");
}

interface Props {
  src: string;
  /** Mesma foto com a lente escurecida: aparece e some sozinha (lente que escurece no sol). */
  sunSrc?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Foto de produto que ocupa o contêiner (o pai precisa ser `relative`), com o efeito de lente opcional. */
export function LensPhoto({ src, sunSrc, alt, sizes, priority, className }: Props) {
  return (
    // A mistura com o fundo fica no contêiner; a foto escura anima só a opacidade,
    // sem modo de mistura próprio (combinação que o Safari do iPhone nem sempre redesenha).
    <span className="absolute inset-0 mix-blend-multiply">
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={isBundledImage(src)} className={cn("object-contain", className)} />
      {sunSrc && (
        // Baixa prioridade: não compete com a foto principal (maior elemento da tela). A animação
        // começa com a foto escura invisível, dando tempo de ela carregar antes de aparecer.
        <Image src={sunSrc} alt="" aria-hidden fill sizes={sizes} fetchPriority="low" unoptimized={isBundledImage(sunSrc)} className={cn("animate-lens-sun object-contain", className)} />
      )}
    </span>
  );
}
