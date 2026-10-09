"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Stars } from "@/components/store/stars";
import { submitReview, type ReviewResult } from "@/app/actions/reviews";
import { dataBR, cn } from "@/lib/utils";
import type { Review } from "@/lib/types";

/**
 * Bloco de avaliações da página de produto.
 *
 * Mostra a distribuição de notas antes da lista: quem lê avaliação está
 * procurando o PIOR caso, e a barra de 1 e 2 estrelas é o atalho honesto para
 * isso. Esconder as notas baixas só faz o cliente procurar em outro lugar.
 */
export function Reviews({
  productId,
  reviews,
  isLoggedIn,
}: {
  productId: string;
  reviews: Review[];
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [rating, setRating] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const count = reviews.length;
  const avg = count
    ? reviews.reduce((s, r) => s + r.rating, 0) / count
    : null;

  const buckets = [5, 4, 3, 2, 1].map((n) => ({
    n,
    qty: reviews.filter((r) => r.rating === n).length,
  }));

  return (
    <section id="avaliacoes" className="border-t border-line pt-12">
      <p className="eyebrow">Avaliações</p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-display text-3xl text-ink">
          {count ? "O que dizem quem comprou" : "Ainda sem avaliações"}
        </h2>
        <button
          onClick={() => {
            if (!isLoggedIn) {
              router.push(`/conta/login?next=${encodeURIComponent(pathname)}`);
              return;
            }
            setOpen((v) => !v);
          }}
          className="border border-line px-6 py-2.5 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
        >
          {open ? "Fechar" : "Escrever avaliação"}
        </button>
      </div>

      {count > 0 && (
        <div className="mt-9 grid gap-10 lg:grid-cols-[16rem_1fr]">
          <div>
            <p className="numeral text-5xl leading-none text-ink">
              {avg!.toFixed(1).replace(".", ",")}
            </p>
            <Stars value={avg} size="md" className="mt-3" />
            <p className="mt-2 text-xs text-linen-600">
              {count} {count === 1 ? "avaliação" : "avaliações"}
            </p>

            <ul className="mt-6 space-y-1.5">
              {buckets.map((b) => (
                <li key={b.n} className="flex items-center gap-3 text-xs text-linen-600">
                  <span className="w-3 text-right">{b.n}</span>
                  <span className="text-champagne-500">★</span>
                  <span className="h-1 flex-1 bg-linen-200">
                    <span
                      className="block h-full bg-champagne-500"
                      style={{ width: `${count ? (b.qty / count) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="w-5 text-right tabular-nums">{b.qty}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="space-y-8">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-line pb-8 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} />
                  <span className="text-sm text-ink">{r.author_name}</span>
                  {r.verified_purchase && (
                    <span className="text-[0.625rem] uppercase tracking-[0.12em] text-champagne-700">
                      compra verificada
                    </span>
                  )}
                  <span className="ml-auto text-xs text-linen-500">
                    {dataBR(r.created_at)}
                  </span>
                </div>

                {r.title ? (
                  <h3 className="font-display mt-3 text-xl text-ink">{r.title}</h3>
                ) : null}
                {r.body ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-linen-700">
                    {r.body}
                  </p>
                ) : null}

                {r.reply ? (
                  <div className="mt-4 border-l-2 border-champagne-400 bg-linen-100 px-5 py-4">
                    <p className="text-[0.625rem] uppercase tracking-[0.14em] text-linen-600">
                      Resposta da Aroma Haus
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-linen-700">
                      {r.reply}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {count === 0 && !open && (
        <p className="mt-4 max-w-md text-sm text-linen-700">
          Ninguém avaliou esta fragrância ainda. Se você já levou para casa,
          conte como foi — ajuda muito quem está decidindo.
        </p>
      )}

      {open && (
        <form
          action={(fd) =>
            start(async () => {
              fd.set("rating", String(rating));
              const res = await submitReview(fd);
              setResult(res);
              if (res.needsAuth) {
                router.push(`/conta/login?next=${encodeURIComponent(pathname)}`);
                return;
              }
              if (res.ok) {
                setOpen(false);
                setRating(0);
              }
            })
          }
          className="mt-10 max-w-xl border border-line p-7"
        >
          <input type="hidden" name="product_id" value={productId} />

          <fieldset>
            <legend className="eyebrow mb-3">Sua nota</legend>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} de 5 estrelas`}
                  aria-pressed={rating === n}
                  className={cn(
                    "text-2xl leading-none transition-colors",
                    n <= rating ? "text-champagne-500" : "text-linen-300 hover:text-linen-400",
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 block">
            <span className="eyebrow">Título (opcional)</span>
            <input
              name="title"
              maxLength={120}
              className="mt-2 w-full border-0 border-b border-linen-300 bg-transparent py-2 text-sm outline-none transition-colors focus:border-champagne-600"
            />
          </label>

          <label className="mt-6 block">
            <span className="eyebrow">Sua avaliação</span>
            <textarea
              name="body"
              required
              rows={4}
              maxLength={1500}
              placeholder="Onde você usou, quanto tempo durou, se o cheiro é o que você esperava…"
              className="mt-2 w-full border border-line bg-transparent p-3 text-sm outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600"
            />
          </label>

          <button
            type="submit"
            disabled={pending || rating === 0}
            className="mt-6 inline-flex items-center gap-2 border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enviar avaliação
          </button>

          <p className="mt-4 text-xs leading-relaxed text-linen-600">
            Toda avaliação passa por moderação antes de aparecer. Publicamos as
            críticas também — só não publicamos ofensa.
          </p>

          {result && !result.ok ? (
            <p className="mt-3 text-sm text-danger">{result.message}</p>
          ) : null}
        </form>
      )}

      {result?.ok ? (
        <p className="mt-6 inline-flex items-center gap-2 border border-champagne-500 px-5 py-3 text-sm text-champagne-700">
          <Check className="h-4 w-4" strokeWidth={1.5} /> {result.message}
        </p>
      ) : null}
    </section>
  );
}
