import { Heart } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guards";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/components/store/product-card";
import { getFavoriteProducts } from "@/server/services/catalog";

export const metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const user = await requireUserPage("/conta/favoritos");
  const products = await getFavoriteProducts(user.id);
  if (products.length === 0) {
    return <EmptyState icon={<Heart className="size-6" />} title="Nenhum favorito ainda" description="Toque no coração na página de um produto para salvá-lo aqui." action={<ButtonLink href="/produtos">Explorar modelos</ButtonLink>} />;
  }
  return (
    <section>
      <h2 className="text-xl font-semibold">Favoritos</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
