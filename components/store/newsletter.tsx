"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { subscribeNewsletter, type NewsletterResult } from "@/app/actions/newsletter";

export function Newsletter() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<NewsletterResult | null>(null);

  return (
    <section className="surface-linen border-t border-line">
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="eyebrow">Carta da Haus</p>
        <h2 className="font-display-xl mt-5 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight text-ink">
          Lançamentos, edições limitadas e o que sai do forno primeiro
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-linen-700">
          Uma carta por mês, no máximo. Sem promoção genérica e sem vender seu
          e-mail para ninguém.
        </p>

        {result?.ok ? (
          <p className="mt-9 inline-flex items-center gap-2 border border-champagne-500 px-6 py-3.5 text-sm text-champagne-700">
            <Check className="h-4 w-4" strokeWidth={1.5} /> {result.message}
          </p>
        ) : (
          <form
            action={(fd) =>
              start(async () => {
                setResult(await subscribeNewsletter(fd));
              })
            }
            className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              name="email"
              required
              placeholder="seu e-mail"
              aria-label="Seu e-mail"
              className="w-full border-0 border-b border-linen-400 bg-transparent px-1 py-3 text-sm text-ink outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex shrink-0 items-center justify-center gap-2 border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Assinar
            </button>
          </form>
        )}
        {result && !result.ok && (
          <p className="mt-4 text-sm text-danger">{result.message}</p>
        )}
      </div>
    </section>
  );
}
