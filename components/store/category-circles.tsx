import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

/**
 * Os formatos da casa, em tiles grandes.
 *
 * Cada categoria tem a sua arte própria (fundo tingido + o frasco do formato),
 * e não a foto do primeiro produto cadastrado: assim a fileira inteira tem
 * ritmo de cor, em vez de cinco fundos iguais.
 */
export function CategoryCircles({
  circles,
}: {
  circles: { name: string; slug: string; image: string | null }[];
}) {
  if (circles.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Navegue por formato</p>
          <h2 className="font-display mt-3 text-3xl text-ink">
            O que você está procurando?
          </h2>
        </div>
        <Link
          href="/produtos"
          className="group inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700 transition-colors hover:text-champagne-700"
        >
          Ver tudo
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {circles.map((c) => (
          <Link key={c.slug} href={`/categoria/${c.slug}`} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-linen-100">
              {c.image ? (
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width:768px) 50vw, 20vw"
                  className="object-cover transition-transform duration-[900ms] group-hover:scale-[1.07]"
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-linen-900/75 to-transparent pt-16">
                <div className="flex items-center justify-between gap-2 px-4 pb-4">
                  <h3 className="font-display text-lg leading-tight text-linen-50">
                    {c.name}
                  </h3>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-champagne-300 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
