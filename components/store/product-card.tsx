"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag } from "lucide-react";
import { formatBRL, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart/cart-context";
import { useStoreConfig } from "@/lib/store-config-context";
import { Stars } from "@/components/store/stars";
import { WishlistButton } from "@/components/store/wishlist-button";
import type { Product, ProductWithDetails } from "@/lib/types";

/**
 * Card de produto.
 *
 * Título, preço e botão de compra, como em qualquer loja: o cliente decide no
 * card e só abre a página se quiser ler sobre a fragrância.
 *
 * O botão muda conforme o produto tem ou não tamanho:
 *
 * - **sem tamanho** (sabonete, home spray, refil, kit) → põe na sacola ali
 *   mesmo, sem sair da vitrine;
 * - **com mais de um tamanho** (difusor 250/500 ml) → leva para a página, que
 *   é onde a escolha existe. Escolher por ele e mandar o de 250 ml seria
 *   decidir no lugar do cliente o item mais caro ou mais barato da linha.
 *
 * O título é a FRAGRÂNCIA e o olho é o formato: numa página de difusores,
 * "Difusor de Varetas" se repete em oito cards e não ajuda ninguém a escolher.
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
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

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

  // Um tamanho só cadastrado ainda é compra direta — a escolha é obrigatória
  // apenas quando existe mais de uma opção.
  const unica = variants.length === 1 ? variants[0] : null;
  const precisaEscolher = variants.length > 1;

  function comprar() {
    if (soldOut || onRequest) return;

    if (precisaEscolher) {
      router.push(`/produto/${product.slug}`);
      return;
    }

    addItem({
      id: unica ? unica.id : product.id,
      productId: product.id,
      variantId: unica?.id ?? null,
      variantLabel: unica?.label ?? null,
      slug: product.slug,
      name: product.name,
      price: unica ? Number(unica.price) : Number(product.price),
      image: cover,
      stock: unica ? unica.stock : product.stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const rotulo = soldOut
    ? "Esgotado"
    : onRequest
      ? "Consultar"
      : precisaEscolher
        ? "Escolher tamanho"
        : added
          ? "Na sacola"
          : "Adicionar à sacola";

  return (
    // O card é uma peça fechada — moldura, foto, ficha e botão — para cada
    // produto se separar do vizinho. Antes era foto e texto soltos no fundo,
    // e numa grade de oito difusores iguais um card emendava no outro.
    <article className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-line bg-linen-50 transition-[border-color,box-shadow] duration-300 hover:border-linen-300 hover:shadow-[0_22px_44px_-30px_rgba(51,35,29,0.6)]">
      <WishlistButton
        productId={product.id}
        initialSaved={saved}
        className="absolute right-3 top-3 z-10 rounded-full shadow-sm transition-opacity focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
      />

      <Link href={`/produto/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/5] overflow-hidden bg-linen-100">
          <Image
            src={cover}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={cn(
              "object-cover transition-[opacity,transform] duration-700 group-hover:scale-[1.03]",
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

          {/* Selos. No máximo um — dois viram poluição. */}
          <div className="absolute left-3 top-3">
            {discount > 0 && !soldOut ? (
              <span className="numeral rounded-full bg-champagne-600 px-2.5 py-1 text-[0.625rem] font-medium tracking-[0.08em] text-linen-50">
                −{discount}%
              </span>
            ) : product.featured && !soldOut ? (
              <span className="rounded-full border border-linen-200 bg-linen-50/95 px-2.5 py-1 text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-champagne-700 backdrop-blur-sm">
                {/* No celular o coração fica sempre à vista: o selo encurta
                    para não passar por baixo dele. */}
                <span className="sm:hidden">Favorito</span>
                <span className="hidden sm:inline">Favorito da casa</span>
              </span>
            ) : null}
          </div>

          {soldOut && (
            <div className="absolute inset-0 grid place-items-center bg-linen-50/70">
              <span className="border border-linen-900/20 bg-linen-50 px-4 py-1.5 text-[0.625rem] uppercase tracking-[0.18em] text-ink">
                Esgotado
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col border-t border-line px-3.5 pb-4 pt-4 sm:px-5">
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}

          <h3 className="font-display text-[1.0625rem] leading-snug text-ink transition-colors group-hover:text-champagne-700">
            {title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {product.olfactory_family ? (
              <span className="text-xs text-linen-600">{product.olfactory_family}</span>
            ) : null}
            {rating != null && ratingCount > 0 ? (
              <Stars value={rating} count={ratingCount} />
            ) : null}
          </div>

          {/* Preço no pé da ficha, separado por um fio: alinha entre cards
              de alturas diferentes. */}
          <div className="mt-auto border-t border-line pt-3.5">
            {onRequest ? (
              <span className="text-sm uppercase tracking-[0.14em] text-champagne-700">
                Sob consulta
              </span>
            ) : (
              <>
                {discount > 0 && (
                  <span className="numeral block text-xs text-linen-500 line-through">
                    {formatBRL(compareAt)}
                  </span>
                )}
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  {fromPrice ? (
                    <span className="whitespace-nowrap text-[0.6875rem] text-linen-600">
                      a partir de
                    </span>
                  ) : null}
                  <span className="numeral text-lg text-ink">{formatBRL(price)}</span>
                </div>
                <span className="numeral mt-0.5 block text-xs text-linen-600">
                  {maxInstallments}x de {formatBRL(parcela)}
                  {semJuros ? " sem juros" : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Fora do link: botão dentro de âncora é HTML inválido, e o clique de
          comprar não pode virar navegação. */}
      <div className="px-3.5 pb-4 sm:px-5 sm:pb-5">
        <button
          type="button"
          onClick={comprar}
          disabled={soldOut}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border px-2 py-3 text-[0.5625rem] uppercase tracking-[0.08em] transition-colors sm:px-4 sm:text-[0.625rem] sm:tracking-[0.16em]",
            soldOut
              ? "cursor-not-allowed border-line text-linen-500"
              : added
                ? "border-champagne-600 bg-champagne-600 text-linen-50"
                : "border-champagne-600 text-champagne-700 hover:bg-champagne-600 hover:text-linen-50",
          )}
        >
          {added ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
          ) : soldOut ? null : (
            <ShoppingBag className="hidden h-3.5 w-3.5 sm:block" strokeWidth={1.5} />
          )}
          {rotulo}
        </button>
      </div>
    </article>
  );
}
