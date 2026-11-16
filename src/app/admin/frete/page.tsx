import { requirePermissionPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { ShippingZoneManager } from "@/components/admin/managers";

export const metadata = { title: "Frete" };

export default async function ShippingPage() {
  await requirePermissionPage("shipping:write");
  const rows = await db.shippingZone.findMany({ orderBy: [{ zipStart: "asc" }, { priceCents: "asc" }] });
  return (
    <>
      <AdminHeader title="Frete" description="Tabela de frete por faixa de CEP. Cadastre um serviço por faixa (ex.: PAC e SEDEX) — o cliente escolhe no checkout." />
      <ShippingZoneManager rows={rows} />
    </>
  );
}
