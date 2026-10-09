"use client";

import Link from "next/link";
import Image from "next/image";
import { formatBRL, cn } from "@/lib/utils";
import { useStoreConfig } from "@/lib/store-config-context";
import { Stars } from "@/components/store/stars";
import { WishlistButton } from "@/components/store/wishlist-button";
import type { Product, ProductWithDetails } from "@/lib/types";

/**
 * Card de produto.
 *
 * O título é a FRAGRÂNCIA e o olho é o formato: em uma página de difusores,
 * "Difusor de Varetas" se repete em oito cards e não ajuda ninguém a escolher
 * — o que diferencia é o cheiro.
 *
 * O bloco de preço mostra o parcelamento junto com o valor porque é assim que
 * se compra no Brasil: muita gente decide pela parcela, não pelo total.
 */
export function ProductCard({
  product,
  saved = false,
  priority = false,
}: {
  product: Product | ProductWithDetails;
  /** Se já está na lista de desejos deste cliente. */
  saved?: boolean;
  priority?: boolean;
}) {
  const { maxInstallments, interestFreeInstallments } = useStoreConfig();

  const variants = "variants" in product ? product.variants : [];
  const rating = "rating_avg" in product ? product.rating_avg : null;
  const ratingCount = "rating_count" in product ? product.rating_count : 0;

  const cover = product.images?.[0] ?? "/brand/placeholder.svg";
  const hover = product.images?.[1] ?? null;

  // Com tamanhos, o preço do card é o MENOR entre eles — é o "a partir de"
  // que o cliente vê, e o mesmo que a página de produto vai cobrar.
  const prices = variants.length
    ? variants.map((v) => Number(v.price))
    : [Number(product.price)];
  const price = Math.min(...prices);
  const fromPrice = variants.length > 1 && Math.max(...prices) > price;

  const onRequest = !price || price <= 0;
  const inStock = variants.length
    ? variants.some((v) => v.stock > 0)
    : product.stock > 0;
  const soldOut = !onRequest && !inStock;

  const compareAt = Number(product.compare_at_price ?? 0);
  const discount =
    compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;

  const parcela = price / maxInstallments;
  const semJuros = interestFreeInstallments >= maxInstallments;

  const parts = product.name.split(" — ");
  const title = parts.length > 1 ? parts.slice(1).join(" — ") : product.name;
  const eyebrow = parts.length > 1 ? parts[0] : null;

  return (
    <div className="group relative flex h-full flex-col">
      <WishlistButton
        productId={product.id}
        initialSaved={saved}
        className="absolute right-2.5 top-2.5 z-10 rounded-full shadow-sm transition-opacity focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
      />

      <Link
        href={`/produto/${product.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-sm bg-linen-50 transition-shadow duration-300 hover:shadow-[0_18px_40px_-26px_rgba(43,39,34,0.55)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-linen-100">
          <Image
            src={cover}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={cn(
              "object-cover transition-opacity duration-500",
              hover && "group-hover:opacity-0",
            )}
          />
          {hover ? (
            <Image
              src={hover}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          ) : null}

          {/* Selos. No máximo dois, empilhados — três viram poluição. */}
          <div className="absolute left-0 top-3 flex flex-col items-start gap-1.5">
            {discount > 0 && !soldOut && (
              <span className="bg-champagne-600 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-linen-50">
                −{discount}%
              </span>
            )}
            {product.featured && !soldOut && discount === 0 && (
              <span className="bg-lilac-400 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-linen-50">
                Favorito da casa
              </span>
            )}
          </div>

          {soldOut && (
            <div className="absolute inset-0 grid place-items-center bg-linen-50/70">
              <span className="border border-linen-900/20 bg-linen-50 px-4 py-1.5 text-[0.625rem] uppercase tracking-[0.18em] text-ink">
                Esgotado
              </span>
            </div>
          )}

          {/* Chamada que sobe no hover — o atalho para quem já decidiu. */}
          {!soldOut && (
            <span className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-3 rounded-full bg-linen-900/90 py-2.5 text-center text-[0.625rem] uppercase tracking-[0.18em] text-linen-50 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
              Ver fragrância
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}

          <h3 className="font-display text-xl leading-tight text-ink">{title}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {product.olfactory_family ? (
              <span className="text-xs text-linen-600">{product.olfactory_family}</span>
            ) : null}
            {rating != null && ratingCount > 0 ? (
              <Stars value={rating} count={ratingCount} />
            ) : null}
          </div>

          <div className="mt-auto pt-4">
            {onRequest ? (
              <span className="text-sm uppercase tracking-[0.14em] text-champagne-700">
                Sob consulta
              </span>
            ) : (
              <>
                {discount > 0 && (
                  <span className="block text-xs text-linen-500 line-through">
                    {formatBRL(compareAt)}
                  </span>
                )}
                <div className="flex items-baseline gap-1.5">
                  {fromPrice ? (
                    <span className="text-[0.6875rem] text-linen-600">a partir de</span>
                  ) : null}
                  <span className="text-lg text-ink">{formatBRL(price)}</span>
                </div>
                <span className="mt-0.5 block text-xs text-linen-600">
                  {maxInstallments}x de {formatBRL(parcela)}
                  {semJuros ? " sem juros" : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
