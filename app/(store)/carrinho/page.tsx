"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, X, ShoppingBag, Truck, Lock, Gift } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { formatBRL, qualifiesForFreeShipping } from "@/lib/utils";
import { useStoreConfig } from "@/lib/store-config-context";

export default function CarrinhoPage() {
  const { items, subtotal, updateQty, removeItem, isReady } = useCart();
  const { freeShippingThreshold } = useStoreConfig();

  if (!isReady) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center text-sm text-linen-600">
        Abrindo sua sacola…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <ShoppingBag
          className="mx-auto mb-6 h-10 w-10 text-linen-300"
          strokeWidth={1}
        />
        <h1 className="font-display text-3xl text-ink">Sua sacola está vazia</h1>
        <p className="mt-4 text-sm leading-relaxed text-linen-700">
          Comece pela fragrância — o formato a gente ajuda a escolher.
        </p>
        <Link
          href="/produtos"
          className="mt-9 inline-block border border-linen-900 bg-linen-900 px-9 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
        >
          Ver fragrâncias
        </Link>
      </div>
    );
  }

  const qualifiesFree = qualifiesForFreeShipping(subtotal, freeShippingThreshold);
  const remainingFree = Math.max(0, freeShippingThreshold - subtotal);
  const freePct =
    freeShippingThreshold > 0
      ? Math.min(100, (subtotal / freeShippingThreshold) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display rule mb-10 text-[clamp(2rem,4.5vw,3rem)] text-ink">
        Sua sacola
      </h1>

      {freeShippingThreshold > 0 && (
        <div className="mb-10 border border-line p-5">
          <p className="flex items-center gap-2.5 text-sm text-linen-700">
            <Truck className="h-4 w-4 text-champagne-600" strokeWidth={1.4} />
            {qualifiesFree ? (
              <span className="text-champagne-700">
                Frete grátis liberado no prazo padrão.
              </span>
            ) : (
              <span>
                Faltam <span className="text-ink">{formatBRL(remainingFree)}</span>{" "}
                para o frete grátis.
              </span>
            )}
          </p>
          <div className="mt-3 h-[3px] overflow-hidden bg-linen-200">
            <div
              className="h-full bg-champagne-500 transition-all"
              style={{ width: `${freePct}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <div key={item.id} className="flex gap-5 py-6">
              <Link
                href={`/produto/${item.slug}`}
                className="relative h-28 w-24 shrink-0 overflow-hidden bg-linen-100"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : null}
              </Link>

              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/produto/${item.slug}`}
                      className="font-display text-xl leading-tight text-ink transition-colors hover:text-champagne-700"
                    >
                      {item.name}
                    </Link>
                    {item.variantLabel ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-linen-600">
                        {item.variantLabel}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-sm text-linen-600">
                      {formatBRL(item.price)}
                    </p>
                  </div>
                  <button
                    aria-label={`Remover ${item.name}`}
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-linen-400 transition-colors hover:text-danger"
                  >
                    <X className="h-4 w-4" strokeWidth={1.4} />
                  </button>
                </div>

                <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                  <div className="flex items-center border border-line">
                    <button
                      aria-label="Diminuir quantidade"
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="p-2 text-linen-600 transition-colors hover:text-ink"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <span className="w-9 text-center text-sm text-ink">{item.qty}</span>
                    <button
                      aria-label="Aumentar quantidade"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="p-2 text-linen-600 transition-colors hover:text-ink"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                  <span className="text-ink">{formatBRL(item.price * item.qty)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit border border-line p-7">
          <h2 className="font-display text-2xl text-ink">Resumo</h2>

          <div className="mt-6 flex justify-between text-sm text-linen-700">
            <span>Subtotal</span>
            <span className="text-ink">{formatBRL(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-linen-700">
            <span>Frete</span>
            {/* "Grátis" seco prometeria demais: o grátis cobre a opção de prazo
                padrão, e quem escolher entrega mais rápida paga a diferença. */}
            {qualifiesFree ? (
              <span className="text-champagne-700">grátis no prazo padrão</span>
            ) : (
              <span className="text-linen-600">calculado no checkout</span>
            )}
          </div>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="text-sm text-linen-700">Total</span>
            <span className="font-display text-2xl text-ink">
              {formatBRL(subtotal)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="mt-7 block border border-linen-900 bg-linen-900 px-6 py-4 text-center text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
          >
            Finalizar compra
          </Link>
          <Link
            href="/produtos"
            className="mt-4 block text-center text-[0.6875rem] uppercase tracking-[0.14em] text-linen-600 transition-colors hover:text-ink"
          >
            Continuar comprando
          </Link>

          <div className="mt-7 space-y-2.5 border-t border-line pt-5 text-xs text-linen-600">
            <p className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-champagne-600" strokeWidth={1.4} />
              Pagamento seguro
            </p>
            <p className="flex items-center gap-2">
              <Gift className="h-3.5 w-3.5 text-champagne-600" strokeWidth={1.4} />
              Embrulho de presente sem custo
            </p>
            <p className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-champagne-600" strokeWidth={1.4} />
              Enviamos para todo o Brasil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
