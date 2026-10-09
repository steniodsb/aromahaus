"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { useStoreConfig } from "@/lib/store-config-context";
import { WishlistButton } from "@/components/store/wishlist-button";
import { ShippingCalculator } from "@/components/store/shipping-calculator";
import { formatBRL, cn } from "@/lib/utils";
import type { ProductVariant } from "@/lib/types";

interface BuyProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image: string | null;
}

/**
 * Caixa de compra da página de produto.
 *
 * Preço, tamanho, quantidade, frete e favoritar moram juntos aqui porque todos
 * dependem da MESMA escolha: trocar de 250 ml para 500 ml muda o preço, o
 * estoque e o frete ao mesmo tempo. Separados em componentes irmãos, um deles
 * inevitavelmente ficaria mostrando o número do tamanho antigo.
 */
export function ProductPurchase({
  product,
  variants,
  savedInWishlist = false,
}: {
  product: BuyProduct;
  variants: ProductVariant[];
  savedInWishlist?: boolean;
}) {
  const { addItem } = useCart();
  const { maxInstallments, interestFreeInstallments } = useStoreConfig();
  const router = useRouter();

  // Começa no primeiro tamanho com estoque; se nenhum tiver, no primeiro —
  // aí a página mostra "esgotado" em vez de um seletor que não leva a nada.
  const initial = useMemo(() => {
    if (!variants.length) return null;
    return (variants.find((v) => v.stock > 0) ?? variants[0]).id;
  }, [variants]);

  const [variantId, setVariantId] = useState<string | null>(initial);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = variants.find((v) => v.id === variantId) ?? null;

  const price = variant ? Number(variant.price) : Number(product.price);
  const compareAt = Number(
    (variant ? variant.compare_at_price : product.compare_at_price) ?? 0,
  );
  const stock = variant ? variant.stock : product.stock;
  const outOfStock = stock <= 0;
  const max = stock > 0 ? stock : 99;
  const discount = compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;

  function cartItem() {
    return {
      // Com tamanho, a chave do carrinho é a variante — senão o 250 ml e o
      // 500 ml virariam a mesma linha.
      id: variant ? variant.id : product.id,
      productId: product.id,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      slug: product.slug,
      name: product.name,
      price,
      image: product.image,
      stock,
    };
  }

  function add() {
    if (outOfStock) return;
    addItem(cartItem(), qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function buyNow() {
    if (outOfStock) return;
    addItem(cartItem(), qty);
    router.push("/carrinho");
  }

  return (
    <div className="space-y-7">
      {/* ── Preço ───────────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-display text-4xl text-ink">{formatBRL(price)}</span>
          {discount > 0 && (
            <>
              <span className="text-lg text-linen-500 line-through">
                {formatBRL(compareAt)}
              </span>
              <span className="bg-champagne-600 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] text-linen-50">
                −{discount}%
              </span>
            </>
          )}
        </div>
        <p className="mt-2 text-sm text-linen-700">
          em até {maxInstallments}x de{" "}
          <span className="text-ink">{formatBRL(price / maxInstallments)}</span>
          {interestFreeInstallments >= maxInstallments
            ? " sem juros"
            : interestFreeInstallments >= 2
              ? ` — ${interestFreeInstallments}x sem juros`
              : ""}
        </p>
        <p className="mt-0.5 text-xs text-linen-600">ou à vista no Pix</p>
      </div>

      {/* ── Tamanho ─────────────────────────────────────────────────────── */}
      {variants.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">Tamanho</legend>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => {
              const selected = v.id === variantId;
              const empty = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVariantId(v.id);
                    setQty(1);
                  }}
                  disabled={empty}
                  aria-pressed={selected}
                  className={cn(
                    "border px-6 py-2.5 text-sm transition-colors",
                    selected
                      ? "border-linen-900 bg-linen-900 text-linen-50"
                      : "border-line text-linen-700 hover:border-linen-400",
                    empty &&
                      "cursor-not-allowed text-linen-400 line-through hover:border-line",
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── Quantidade + ações ──────────────────────────────────────────── */}
      {outOfStock ? (
        <div className="border border-line bg-linen-100 px-5 py-4 text-center text-sm text-linen-700">
          {variants.length > 1
            ? "Este tamanho está esgotado. Escolha outro ou avise-nos pelo WhatsApp."
            : "Produto esgotado no momento."}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5">
            <span className="eyebrow">Quantidade</span>
            <div className="flex items-center border border-line">
              <button
                aria-label="Diminuir quantidade"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-2.5 text-linen-600 transition-colors hover:text-ink"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <span className="w-10 text-center text-sm text-ink">{qty}</span>
              <button
                aria-label="Aumentar quantidade"
                onClick={() => setQty((q) => Math.min(max, q + 1))}
                className="p-2.5 text-linen-600 transition-colors hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            {stock <= 5 ? (
              <span className="text-xs text-champagne-700">
                últimas {stock} unidades
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={buyNow}
              className="w-full border border-linen-900 bg-linen-900 px-8 py-4 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
            >
              Comprar agora
            </button>
            <button
              onClick={add}
              className="inline-flex w-full items-center justify-center gap-2 border border-line px-8 py-4 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={1.5} /> Na sacola
                </>
              ) : (
                "Adicionar à sacola"
              )}
            </button>
          </div>
        </>
      )}

      <WishlistButton
        productId={product.id}
        initialSaved={savedInWishlist}
        variant="label"
      />

      <ShippingCalculator productId={product.id} variantId={variant?.id ?? null} />
    </div>
  );
}
