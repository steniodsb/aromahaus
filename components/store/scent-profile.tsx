import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const ROOM_LABEL: Record<string, string> = {
  sala: "Sala",
  quarto: "Quarto",
  banheiro: "Banheiro",
  lavabo: "Lavabo",
  escritorio: "Escritório",
  closet: "Closet",
  cozinha: "Cozinha",
  entrada: "Entrada",
};

const INTENSITY_LABEL = [
  "", // 0 não existe
  "Muito discreta",
  "Discreta",
  "Equilibrada",
  "Marcante",
  "Muito marcante",
];

/**
 * Perfil olfativo.
 *
 * É a parte da página que substitui o cheirar antes de comprar. Pirâmide,
 * intensidade e ambiente sugerido respondem, nesta ordem, as três perguntas
 * que o cliente faz: do que é feito, o quanto se impõe e onde fica bom.
 * Cada bloco só aparece se houver dado — meia pirâmide é pior que nenhuma.
 */
export function ScentProfile({ product }: { product: Product }) {
  const { notes_top, notes_heart, notes_base, intensity, rooms, olfactory_family } =
    product;

  const hasNotes =
    notes_top?.length || notes_heart?.length || notes_base?.length;
  if (!hasNotes && !intensity && !rooms?.length && !olfactory_family) return null;

  const pyramid = [
    { label: "Notas de topo", hint: "o primeiro minuto", list: notes_top },
    { label: "Corpo", hint: "o que fica no ambiente", list: notes_heart },
    { label: "Fundo", hint: "o rastro, horas depois", list: notes_base },
  ].filter((row) => row.list?.length);

  return (
    <section className="border-t border-line pt-12">
      <p className="eyebrow">Perfil olfativo</p>
      <h2 className="font-display mt-4 text-3xl text-ink">
        {olfactory_family ? (
          <>
            Família{" "}
            <Link
              href={`/produtos?familia=${encodeURIComponent(olfactory_family)}`}
              className="border-b border-champagne-500 transition-colors hover:text-champagne-700"
            >
              {olfactory_family}
            </Link>
          </>
        ) : (
          "A fragrância"
        )}
      </h2>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        {pyramid.length > 0 && (
          <dl className="space-y-7">
            {pyramid.map((row) => (
              <div
                key={row.label}
                className="grid gap-2 border-b border-line pb-6 sm:grid-cols-[11rem_1fr] sm:gap-6"
              >
                <dt>
                  <span className="block text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700">
                    {row.label}
                  </span>
                  <span className="mt-1 block text-xs text-linen-500">{row.hint}</span>
                </dt>
                <dd className="font-display text-xl leading-snug text-ink">
                  {row.list!.join(" · ")}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="space-y-10">
          {intensity ? (
            <div>
              <p className="eyebrow">Intensidade</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={cn(
                        "h-1.5 w-9",
                        n <= intensity ? "bg-champagne-500" : "bg-linen-200",
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-linen-700">
                {INTENSITY_LABEL[intensity]}
                <span className="sr-only"> — {intensity} de 5</span>
              </p>
            </div>
          ) : null}

          {rooms?.length ? (
            <div>
              <p className="eyebrow">Combina com</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {rooms.map((r) => (
                  <li
                    key={r}
                    className="border border-line px-4 py-1.5 text-xs text-linen-700"
                  >
                    {ROOM_LABEL[r] ?? r}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {product.fragrance ? (
            <Link
              href={`/produtos?fragrancia=${encodeURIComponent(product.fragrance)}`}
              className="inline-block border-b border-champagne-500 pb-1 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-700 transition-colors hover:text-ink"
            >
              Ver {product.fragrance} em outros formatos
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
