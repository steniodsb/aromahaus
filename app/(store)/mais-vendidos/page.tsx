import type { Metadata } from "next";
import { getBestSellers, getAllCategories, withProductDetails } from "@/lib/queries";
import { ProductFilters } from "@/components/store/product-filters";
import {
  CollectionHeader,
  CollectionEmpty,
} from "@/components/store/collection-header";

export const metadata: Metadata = {
  title: "Mais vendidos",
  description:
    "As fragrâncias que mais saem da Aroma Haus: difusores, home sprays e sabonetes que os clientes compram de novo.",
};

export default async function MaisVendidosPage() {
  const [found, categories] = await Promise.all([
    getBestSellers(60),
    getAllCategories(),
  ]);
  const products = await withProductDetails(found);

  return (
    <>
      <CollectionHeader
        eyebrow="Os queridinhos"
        title="Mais vendidos"
        text="As fragrâncias que mais saem daqui — e, mais importante, as que as pessoas voltam para comprar de novo. Se é a sua primeira vez na casa, comece por esta lista."
      />
      <div className="mx-auto max-w-7xl px-6 py-12">
        {products.length > 0 ? (
          <ProductFilters products={products} categories={categories} />
        ) : (
          <CollectionEmpty>
            O ranking aparece assim que o catálogo estiver cadastrado.
          </CollectionEmpty>
        )}
      </div>
    </>
  );
}
