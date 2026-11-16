"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/http/client";

export function MarkHandledButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await apiFetch(`/api/admin/messages/${id}`, { method: "PATCH" }).catch(() => undefined);
        router.refresh();
      }}
    >
      Marcar como tratada
    </Button>
  );
}
