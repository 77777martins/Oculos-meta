"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      variant="outline"
      loading={busy}
      icon={<Archive className="size-4" />}
      onClick={async () => {
        if (!confirm("Arquivar este produto? Ele sairá da loja, mas o histórico de pedidos é preservado.")) return;
        setBusy(true);
        try {
          await apiFetch(`/api/admin/products/${productId}`, { method: "DELETE" });
          toast.success("Produto arquivado");
          router.replace("/admin/produtos");
        } catch (e) {
          toast.error("Erro", (e as Error).message);
          setBusy(false);
        }
      }}
    >
      Arquivar
    </Button>
  );
}
