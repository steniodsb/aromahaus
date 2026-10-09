import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { agruparPorFamilia, corDaFamilia } from "@/components/site/nav-data";

/**
 * As fragrâncias da casa, agrupadas por família olfativa.
 *
 * É o atalho que falta em quase toda loja de perfumaria: quem já conhece a
 * casa não quer navegar por "difusores", quer ir direto no cheiro de que
 * gostou. E a cor da família dá ao bloco o ritmo visual que uma lista de
 * nomes em preto não tem — o cliente aprende, em uma olhada, que amadeirado
 * é marrom e floral é lilás.
 */
export function FragranceStrip({
  fragrances,
}: {
  fragrances: { name: string; family: string | null }[];
}) {
  if (fragrances.length === 0) return null;
  const familias = agruparPorFamilia(fragrances);

  return (
    <section className="border-y border-line bg-linen-50">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Escolha pelo cheiro</p>
            <h2 className="font-display mt-3 text-3xl text-ink">
              {fragrances.length} fragrâncias autorais
            </h2>
          </div>
          <Link
            href="/produtos"
            className="group inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700 transition-colors hover:text-champagne-700"
          >
            Ver catálogo
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              strokeWidth={1.5}
            />
          </Link>
        </div>

        <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {familias.map((g) => (
            <div key={g.family}>
              <Link
                href={`/produtos?familia=${encodeURIComponent(g.family)}`}
                className="mb-4 flex items-center gap-2.5 border-b border-line pb-2.5 transition-colors hover:border-champagne-500"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${corDaFamilia(g.family)}`} />
                <span className="text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700">
                  {g.family}
                </span>
                <span className="ml-auto text-[0.625rem] text-linen-500">
                  {g.names.length}
                </span>
              </Link>

              <ul className="space-y-2">
                {g.names.map((name) => (
                  <li key={name}>
                    <Link
                      href={`/produtos?fragrancia=${encodeURIComponent(name)}`}
                      className="font-display text-xl leading-snug text-ink transition-colors hover:text-champagne-700"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
