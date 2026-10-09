import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  getProductDetails,
  getProductReviews,
  getRelatedProducts,
  getWishlistIds,
  withProductDetails,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/utils";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductCarousel } from "@/components/store/product-carousel";
import { ScentProfile } from "@/components/store/scent-profile";
import { Reviews } from "@/components/store/reviews";
import { Stars } from "@/components/store/stars";
import { ShareButtons } from "@/components/store/share-buttons";
import { Markdown } from "@/components/markdown";

export async function generateMetadata(
  props: PageProps<"/produto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductDetails(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.description ?? undefined,
    openGraph: {
      title: product.seo_title ?? product.name,
      description: product.seo_description ?? product.description ?? undefined,
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductDetails(slug);
  if (!product) notFound();

  const supabase = await createClient();
  const [{ data: auth }, reviews, relatedRaw, savedIds] = await Promise.all([
    supabase.auth.getUser(),
    getProductReviews(product.id),
    getRelatedProducts(product, 12),
    getWishlistIds(),
  ]);
  const related = await withProductDetails(relatedRaw);

  const cover = product.images?.[0] ?? "/brand/placeholder.svg";
  const variants = product.variants;

  // Com tamanhos, o "a partir de" da página é o menor preço disponível —
  // o mesmo número que o card mostrou na vitrine.
  const prices = variants.length
    ? variants.map((v) => Number(v.price))
    : [Number(product.price)];
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const onRequest = !lowPrice || lowPrice <= 0;
  const inStock = variants.length
    ? variants.some((v) => v.stock > 0)
    : product.stock > 0;

  const parts = product.name.split(" — ");
  const title = parts.length > 1 ? parts.slice(1).join(" — ") : product.name;
  const format = parts.length > 1 ? parts[0] : null;

  const volumeLabel = variants.length
    ? variants.map((v) => v.label).join(" · ")
    : product.volume_ml
      ? `${product.volume_ml} ml`
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images ?? undefined,
    sku: product.sku ?? undefined,
    brand: { "@type": "Brand", name: "Aroma Haus" },
    ...(product.rating_avg && product.rating_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating_avg,
            reviewCount: product.rating_count,
          },
        }
      : {}),
    ...(onRequest
      ? {}
      : {
          offers:
            variants.length > 1
              ? {
                  "@type": "AggregateOffer",
                  priceCurrency: "BRL",
                  lowPrice,
                  highPrice,
                  offerCount: variants.length,
                  availability: inStock
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                }
              : {
                  "@type": "Offer",
                  priceCurrency: "BRL",
                  price: lowPrice,
                  availability: inStock
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                },
        }),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-8 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-500">
        <Link href="/" className="transition-colors hover:text-champagne-700">Início</Link>
        <span className="mx-2.5">/</span>
        <Link href="/produtos" className="transition-colors hover:text-champagne-700">
          Catálogo
        </Link>
        <span className="mx-2.5">/</span>
        <span className="text-linen-700">{title}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <ProductGallery
          images={product.images?.length ? product.images : [cover]}
          alt={product.name}
        />

        <div>
          {format ? <p className="eyebrow">{format}</p> : null}
          <h1 className="font-display-xl mt-3 text-[clamp(2rem,4.5vw,3rem)] leading-tight text-ink">
            {title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-linen-600">
            {product.olfactory_family ? (
              <span className="uppercase tracking-[0.14em]">
                {product.olfactory_family}
              </span>
            ) : null}
            {volumeLabel ? <span>{volumeLabel}</span> : null}
            {product.rating_count > 0 ? (
              <a href="#avaliacoes" className="transition-colors hover:text-champagne-700">
                <Stars value={product.rating_avg} count={product.rating_count} />
              </a>
            ) : null}
            {product.sku ? <span>cód. {product.sku}</span> : null}
          </div>

          <div className="mt-9">
            {onRequest ? (
              <div className="space-y-5">
                <p className="font-display text-2xl text-ink">Sob consulta</p>
                <a
                  href={whatsappLink(
                    `Olá! Quero saber o preço e a disponibilidade de: ${product.name}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-linen-900 bg-linen-900 px-8 py-4 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.4} />
                  Consultar no WhatsApp
                </a>
              </div>
            ) : (
              <ProductPurchase
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  compare_at_price: product.compare_at_price,
                  stock: product.stock,
                  image: cover,
                }}
                variants={variants}
                savedInWishlist={savedIds.has(product.id)}
              />
            )}
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <ShareButtons title={product.name} />
          </div>
        </div>
      </div>

      <div className="mt-20 space-y-20">
        {product.description ? (
          <section className="max-w-2xl border-t border-line pt-12">
            <p className="eyebrow">Sobre</p>
            <div className="mt-6 text-[0.9375rem] leading-relaxed text-linen-700">
              <Markdown content={product.description} />
            </div>
          </section>
        ) : null}

        <ScentProfile product={product} />

        <Reviews
          productId={product.id}
          reviews={reviews}
          isLoggedIn={Boolean(auth?.user)}
        />

        {related.length > 0 ? (
          <div className="border-t border-line">
            <ProductCarousel
              products={related}
              title={
                product.fragrance
                  ? `Mais ${product.fragrance}`
                  : "Você também pode gostar"
              }
              subtitle={
                product.fragrance
                  ? "A mesma fragrância em outros formatos, e vizinhas da mesma família olfativa."
                  : undefined
              }
              savedIds={savedIds}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
