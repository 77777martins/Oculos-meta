"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";

export function ReviewActions({ id, status }: { id: string; status: "PENDING" | "PUBLISHED" | "REJECTED" }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function moderate(next: "PUBLISHED" | "REJECTED") {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status: next } });
      toast.success(next === "PUBLISHED" ? "Avaliação publicada" : "Avaliação recusada");
      router.refresh();
    } catch (e) {
      toast.error("Não foi possível salvar", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      {status !== "PUBLISHED" && (
        <Button size="sm" variant="dark" loading={busy} onClick={() => moderate("PUBLISHED")}>
          Publicar
        </Button>
      )}
      {status !== "REJECTED" && (
        <Button size="sm" variant="outline" loading={busy} onClick={() => moderate("REJECTED")}>
          {status === "PUBLISHED" ? "Tirar do ar" : "Recusar"}
        </Button>
      )}
    </div>
  );
}
