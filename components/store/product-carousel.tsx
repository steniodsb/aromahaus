"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import type { Product, ProductWithDetails } from "@/lib/types";

export function ProductCarousel({
  products,
  title,
  subtitle,
  savedIds,
}: {
  products: (Product | ProductWithDetails)[];
  title: string;
  subtitle?: string;
  /** Ids já na lista de desejos, para o coração nascer pintado. */
  savedIds?: Set<string> | string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = savedIds instanceof Set ? savedIds : new Set(savedIds ?? []);

  function scroll(dir: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.86, 640), behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <section className="py-14">
      <div className="mb-9 flex items-end justify-between gap-6">
        <div>
          <h2 className="font-display rule text-3xl text-ink">{title}</h2>
          {subtitle ? (
            <p className="mt-4 max-w-md text-sm text-linen-700">{subtitle}</p>
          ) : null}
        </div>
        {products.length > 2 && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              aria-label="Anterior"
              onClick={() => scroll(-1)}
              className="border border-line p-2.5 text-linen-700 transition-colors hover:border-champagne-500 hover:text-champagne-700"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.4} />
            </button>
            <button
              aria-label="Próximo"
              onClick={() => scroll(1)}
              className="border border-line p-2.5 text-linen-700 transition-colors hover:border-champagne-500 hover:text-champagne-700"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.4} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-[28%] xl:w-[23%]"
          >
            <ProductCard product={p} saved={saved.has(p.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}
