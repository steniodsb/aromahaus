import type { Metadata } from "next";
import Link from "next/link";
import {
  searchProducts,
  getTopCategories,
  getAllCategories,
  withProductDetails,
} from "@/lib/queries";
import { ProductFilters } from "@/components/store/product-filters";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Todas as fragrâncias da Aroma Haus: difusores de varetas, home sprays, sabonetes líquidos, refis e kits de presente, com envio para todo o Brasil.",
};

export default async function ProdutosPage(props: PageProps<"/produtos">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const fragrancia = typeof sp.fragrancia === "string" ? sp.fragrancia : undefined;
  const familia = typeof sp.familia === "string" ? sp.familia : undefined;

  const [found, topCategories, categories] = await Promise.all([
    searchProducts(q),
    getTopCategories(),
    getAllCategories(),
  ]);
  const products = await withProductDetails(found);

  const title = q
    ? `Resultados para “${q}”`
    : fragrancia
      ? fragrancia
      : familia
        ? `Família ${familia}`
        : "Todas as fragrâncias";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10">
        <p className="eyebrow">Catálogo</p>
        <h1 className="font-display rule mt-4 text-[clamp(2rem,4.5vw,3rem)] leading-tight text-ink">
          {title}
        </h1>
      </header>

      <div className="mb-10 flex flex-wrap gap-2.5">
        <Link
          href="/produtos"
          className={
            q || fragrancia || familia
              ? "border border-line px-5 py-2 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
              : "border border-linen-900 bg-linen-900 px-5 py-2 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-50"
          }
        >
          Tudo
        </Link>
        {topCategories.map((c) => (
          <Link
            key={c.id}
            href={`/categoria/${c.slug}`}
            className="border border-line px-5 py-2 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length > 0 ? (
        <ProductFilters
          products={products}
          categories={categories}
          initialFragrance={fragrancia}
          initialFamily={familia}
        />
      ) : (
        <p className="border border-dashed border-linen-300 p-12 text-center text-sm text-linen-700">
          {q
            ? `Nada encontrado para “${q}”. Tente o nome da fragrância ou do formato.`
            : "O catálogo ainda está sendo montado."}
        </p>
      )}
    </div>
  );
}
