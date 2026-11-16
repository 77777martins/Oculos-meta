"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast";

/** Envia uma imagem para /api/admin/uploads e devolve a URL armazenada. */
export function ImageUploadButton({ folder, onUploaded, label = "Enviar imagem" }: { folder: "products" | "banners" | "categories" | "media"; onUploaded: (url: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande", "Limite de 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);
      const res = await fetch("/api/admin/uploads", { method: "POST", body, credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as { data?: { url: string }; error?: { message: string } } | null;
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Falha no upload.");
      onUploaded(json.data.url);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error("Erro no upload", (e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()} icon={<ImagePlus className="size-4" />}>
        {label}
      </Button>
    </>
  );
}
