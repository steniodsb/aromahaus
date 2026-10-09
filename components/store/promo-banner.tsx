import Link from "next/link";
import Image from "next/image";
import { DEFAULT_PROMO, type PromoBanner as PromoData } from "@/lib/store-defaults";

export function PromoBanner({ promo }: { promo?: PromoData | null }) {
  const p = promo ?? DEFAULT_PROMO;
  if (p.enabled === false || !p.title?.trim()) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href={p.ctaHref || "/produtos"}
        className="group relative flex min-h-[18rem] items-center overflow-hidden bg-linen-200 sm:min-h-[22rem]"
      >
        {p.image && (
          <Image
            src={p.image}
            alt=""
            fill
            sizes="(max-width:1280px) 100vw, 1200px"
            className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
          />
        )}
        {/* Véu quente, não preto: escurecer com cinza mataria o linho da foto. */}
        <div className="absolute inset-0 bg-gradient-to-r from-linen-900/80 via-linen-900/45 to-transparent" />
        <div className="relative max-w-md p-9 sm:p-14">
          {p.eyebrow && (
            <p className="eyebrow !text-champagne-300">{p.eyebrow}</p>
          )}
          <h2 className="font-display mt-4 text-[clamp(1.75rem,3.4vw,2.75rem)] leading-tight text-linen-50">
            {p.title}
          </h2>
          <span className="mt-8 inline-block border border-linen-50/60 px-8 py-3 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors group-hover:border-champagne-400 group-hover:text-champagne-300">
            {p.ctaLabel || "Ver mais"}
          </span>
        </div>
      </Link>
    </section>
  );
}
