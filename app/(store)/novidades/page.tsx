import type { Metadata } from "next";
import { getNewArrivals, getAllCategories, withProductDetails, getWishlistIds } from "@/lib/queries";
import { ProductFilters } from "@/components/store/product-filters";
import {
  CollectionHeader,
  CollectionEmpty,
} from "@/components/store/collection-header";

export const metadata: Metadata = {
  title: "Novidades",
  description:
    "As últimas fragrâncias e formatos que entraram no catálogo da Aroma Haus.",
};

export default async function NovidadesPage() {
  const [found, categories] = await Promise.all([
    getNewArrivals(60),
    getAllCategories(),
  ]);
  const products = await withProductDetails(found);
  const savedIds = await getWishlistIds();

  return (
    <>
      <CollectionHeader
        tone="champagne"
        eyebrow="Acabou de chegar"
        title="Novidades"
        text="O que entrou no catálogo por último, da mais recente para a mais antiga. Fragrância nova sai primeiro em lote pequeno."
      />
      <div className="mx-auto max-w-7xl px-6 py-12">
        {products.length > 0 ? (
          <ProductFilters
            products={products}
            categories={categories}
            savedIds={savedIds}
          />
        ) : (
          <CollectionEmpty>
            Nada novo por enquanto. Volte em algumas semanas.
          </CollectionEmpty>
        )}
      </div>
    </>
  );
}
