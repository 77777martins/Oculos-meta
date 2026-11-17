import Image from "next/image";
import { cn } from "@/lib/utils";
import { GlassesArt } from "./glasses-art";

/** Imagem do produto com placeholder vetorial quando não houver foto cadastrada. */
export function ProductImage({ src, alt, className, sizes, priority }: { src: string | null | undefined; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 p-8", className)}>
        <GlassesArt className="max-w-[80%] opacity-90" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-slate-50", className)}>
      <Image src={src} alt={alt} fill sizes={sizes ?? "(max-width: 768px) 50vw, 25vw"} className="object-contain p-1" priority={priority} unoptimized={src.startsWith("/images/")} />
    </div>
  );
}
