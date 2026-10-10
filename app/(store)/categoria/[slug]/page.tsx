import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCategoryBySlug,
  getChildCategories,
  getProductsByCategory,
  getAllCategories,
  withProductDetails,
  getWishlistIds,
} from "@/lib/queries";
import { ProductFilters } from "@/components/store/product-filters";

export async function generateMetadata(
  props: PageProps<"/categoria/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Categoria não encontrada" };
  return {
    title: category.name,
    description:
      category.description ??
      `${category.name} em fragrâncias autorais da Aroma Haus, com envio para todo o Brasil.`,
  };
}

export default async function CategoryPage(
  props: PageProps<"/categoria/[slug]">,
) {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [children, allCategories] = await Promise.all([
    getChildCategories(category.id),
    getAllCategories(),
  ]);
  const found = await getProductsByCategory(
    category.id,
    children.map((c) => c.id),
  );
  const products = await withProductDetails(found);
  const savedIds = await getWishlistIds();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <nav className="mb-6 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-500">
        <Link href="/" className="transition-colors hover:text-champagne-700">
          Início
        </Link>
        <span className="mx-2.5">/</span>
        <Link href="/produtos" className="transition-colors hover:text-champagne-700">
          Catálogo
        </Link>
        <span className="mx-2.5">/</span>
        <span className="text-linen-700">{category.name}</span>
      </nav>

      <header className="mb-12 max-w-2xl">
        <h1 className="font-display-xl rule text-[clamp(2rem,4.5vw,3rem)] leading-tight text-ink">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-7 text-[0.9375rem] leading-relaxed text-linen-700">
            {category.description}
          </p>
        ) : null}
      </header>

      {products.length > 0 ? (
        <ProductFilters
          products={products}
          categories={allCategories}
          savedIds={savedIds}
          showFormat={children.length > 0}
        />
      ) : (
        <p className="border border-dashed border-linen-300 p-12 text-center text-sm text-linen-700">
          Nada por aqui ainda. Volte em breve.
        </p>
      )}
    </div>
  );
}
