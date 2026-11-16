import type { Metadata } from "next";
import { CartView } from "@/components/checkout/cart-view";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-12">
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Carrinho</h1>
      <CartView />
    </div>
  );
}
