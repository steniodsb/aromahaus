import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export interface PromoTile {
  image: string;
  eyebrow: string;
  title: string;
  text: string;
  ctaLabel: string;
  href: string;
  /** Lado onde o texto fica — acompanha o lado vazio da arte. */
  align?: "left" | "right";
}

/**
 * Duas peças promocionais lado a lado.
 *
 * É o espaço onde a loja empurra o que tem margem (kits) e o que gera
 * recompra (refil) — as duas coisas que a vitrine de produto sozinha não
 * consegue destacar, porque lá tudo tem o mesmo peso.
 */
export function PromoMosaic({ tiles }: { tiles: PromoTile[] }) {
  if (!tiles.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-5 lg:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group relative flex min-h-[22rem] overflow-hidden rounded-sm bg-linen-200 sm:min-h-[20rem]"
          >
            <Image
              src={t.image}
              alt=""
              fill
              sizes="(max-width:1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1100ms] group-hover:scale-[1.05]"
            />
            {/* No celular o véu vem de baixo e o texto é sempre à esquerda:
                lado a lado, a coluna fica estreita demais e a chamada cai em
                cima do produto. */}
            <div
              className={
                t.align === "right"
                  ? "absolute inset-0 bg-gradient-to-t from-linen-900/90 via-linen-900/40 to-transparent sm:bg-gradient-to-l sm:from-linen-900/85 sm:via-linen-900/30 sm:to-transparent"
                  : "absolute inset-0 bg-gradient-to-t from-linen-900/90 via-linen-900/40 to-transparent sm:bg-gradient-to-r sm:from-linen-900/85 sm:via-linen-900/30 sm:to-transparent"
              }
            />
            <div
              className={`relative flex w-full items-end p-7 sm:items-center sm:p-10 ${
                t.align === "right" ? "sm:justify-end sm:text-right" : ""
              }`}
            >
              <div className="max-w-[18rem]">
                <p className="text-[0.625rem] uppercase tracking-[0.2em] text-champagne-300">
                  {t.eyebrow}
                </p>
                <h3 className="font-display mt-3 text-[clamp(1.5rem,2.6vw,2.125rem)] leading-tight text-linen-50">
                  {t.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-linen-300">{t.text}</p>
                <span
                  className={`mt-6 inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] text-champagne-300 ${
                    t.align === "right" ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  {t.ctaLabel}
                  <ArrowRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      t.align === "right"
                        ? "sm:-rotate-180 group-hover:translate-x-1 sm:group-hover:-translate-x-1"
                        : "group-hover:translate-x-1"
                    }`}
                    strokeWidth={1.5}
                  />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
