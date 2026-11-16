"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useToast } from "@/components/providers/toast";
import { ImageUploadButton } from "./image-upload";

export function MediaLibrary({ assets }: { assets: Array<{ id: string; url: string; alt: string | null; sizeBytes: number }> }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <div>
      <div className="mb-6">
        <ImageUploadButton folder="media" onUploaded={() => router.refresh()} />
      </div>
      {assets.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma imagem enviada.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
              <div className="relative aspect-square bg-slate-50">
                <Image src={a.url} alt={a.alt ?? ""} fill sizes="200px" className="object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 p-2 text-xs text-slate-500">
                <span>{Math.round(a.sizeBytes / 1024)} KB</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold text-brand-700"
                  onClick={async () => {
                    await navigator.clipboard.writeText(a.url).catch(() => undefined);
                    toast.success("URL copiada");
                  }}
                >
                  <Copy className="size-3" aria-hidden /> URL
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
