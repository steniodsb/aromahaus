import Link from "next/link";
import { Stars } from "@/components/store/stars";
import { dataBR } from "@/lib/utils";
import type { Review } from "@/lib/types";

type Item = Review & { product_name: string; product_slug: string };

/**
 * O que os clientes escreveram.
 *
 * Vem das avaliações reais do banco, não de uma lista fixa no código:
 * depoimento inventado em loja de perfumaria é o tipo de coisa que o cliente
 * percebe, e uma vez percebida ele deixa de acreditar no resto da página. Sem
 * avaliação aprovada, a seção simplesmente não aparece.
 */
export function Testimonials({ reviews }: { reviews: Item[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="surface-ink glow-champagne relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="eyebrow !text-champagne-400">Quem já levou para casa</p>
          <h2 className="font-display-xl mt-4 text-[clamp(1.75rem,3.6vw,2.75rem)] text-linen-50">
            O que dizem por aí
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="relative flex flex-col rounded-sm border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm"
            >
              <span
                aria-hidden="true"
                className="font-display pointer-events-none absolute right-5 top-2 text-6xl leading-none text-champagne-500/25"
              >
                &rdquo;
              </span>

              <Stars value={r.rating} />
              {r.title ? (
                <h3 className="font-display mt-4 text-xl leading-tight text-linen-50">
                  {r.title}
                </h3>
              ) : null}
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-linen-300">
                {r.body}
              </blockquote>

              <figcaption className="mt-6 border-t border-white/10 pt-4 text-xs text-linen-400">
                <span className="text-linen-100">{r.author_name}</span>
                {r.verified_purchase ? (
                  <span className="ml-2 text-champagne-400">· compra verificada</span>
                ) : null}
                <br />
                <Link
                  href={`/produto/${r.product_slug}`}
                  className="mt-1 inline-block transition-colors hover:text-champagne-300"
                >
                  {r.product_name}
                </Link>
                <span className="ml-2 text-linen-500">{dataBR(r.created_at)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
