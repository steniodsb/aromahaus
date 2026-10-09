import type { Metadata } from "next";
import { getPromotions, getAllCategories, withProductDetails } from "@/lib/queries";
import { ProductFilters } from "@/components/store/product-filters";
import {
  CollectionHeader,
  CollectionEmpty,
} from "@/components/store/collection-header";

export const metadata: Metadata = {
  title: "Promoções",
  description:
    "Difusores, home sprays, sabonetes e kits da Aroma Haus com desconto, enquanto durar o estoque.",
};

export default async function PromocoesPage() {
  const [found, categories] = await Promise.all([
    getPromotions(60),
    getAllCategories(),
  ]);
  const products = await withProductDetails(found);

  return (
    <>
      <CollectionHeader
        tone="ink"
        eyebrow="Enquanto durar o estoque"
        title="Promoções"
        text="Fragrâncias com desconto de verdade — preço cheio riscado ao lado, para você conferir. Lote pequeno acaba rápido."
      />
      <div className="mx-auto max-w-7xl px-6 py-12">
        {products.length > 0 ? (
          <ProductFilters products={products} categories={categories} />
        ) : (
          <CollectionEmpty>
            Nenhuma promoção no ar agora. Assine a carta da Haus no rodapé para
            saber antes da próxima.
          </CollectionEmpty>
        )}
      </div>
    </>
  );
}
