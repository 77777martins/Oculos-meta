import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUserPage("/checkout");
  const [addresses, profile] = await Promise.all([
    db.address.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: { id: true, label: true, recipient: true, zipCode: true, street: true, number: true, complement: true, district: true, city: true, state: true, isDefault: true },
    }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true } }),
  ]);
  return (
    <div className="container-page py-12">
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Finalizar compra</h1>
      <CheckoutForm addresses={addresses} defaultName={user.name} defaultPhone={profile.phone} />
    </div>
  );
}
