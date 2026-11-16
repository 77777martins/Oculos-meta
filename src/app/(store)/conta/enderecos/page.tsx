import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { AddressManager } from "@/components/account/address-manager";

export const metadata = { title: "Endereços" };

export default async function AddressesPage() {
  const user = await requireUserPage("/conta/enderecos");
  const addresses = await db.address.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, label: true, recipient: true, zipCode: true, street: true, number: true, complement: true, district: true, city: true, state: true, phone: true, isDefault: true },
  });
  return <AddressManager addresses={addresses} />;
}
