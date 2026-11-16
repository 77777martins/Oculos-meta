"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart } from "lucide-react";
import { apiFetch } from "@/lib/http/client";
import { useToast } from "@/components/providers/toast";
import { cn } from "@/lib/utils";

export function FavoriteButton({ productId, initial, isLoggedIn }: { productId: string; initial: boolean; isLoggedIn: boolean }) {
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    const next = !fav;
    setFav(next); // atualização otimista
    try {
      await apiFetch("/api/favorites", { method: next ? "POST" : "DELETE", body: { productId } });
      toast.success(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
    } catch (e) {
      setFav(!next);
      toast.error("Não foi possível atualizar favoritos", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={fav}
      aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn("flex size-12 shrink-0 items-center justify-center rounded-full border transition-all", fav ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:border-slate-400")}
    >
      <Heart className={cn("size-5 transition-transform", fav && "scale-110 fill-current")} />
    </button>
  );
}
