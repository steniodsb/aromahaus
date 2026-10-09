"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Undo2, Trash2, MessageSquareReply, Loader2 } from "lucide-react";
import {
  setReviewStatus,
  replyToReview,
  deleteReview,
} from "@/app/admin/(panel)/avaliacoes/actions";
import { Stars } from "@/components/store/stars";
import { dataHoraBR } from "@/lib/utils";
import type { Review } from "@/lib/types";

export type ReviewRowData = Review & {
  product_name: string | null;
  product_slug: string | null;
};

/**
 * Uma avaliação na fila de moderação.
 *
 * Mostra o texto inteiro, nunca cortado: moderar é ler, e um "ver mais" aqui
 * só faria o moderador aprovar sem ter lido o fim do comentário.
 */
export function ReviewRow({ review }: { review: ReviewRowData }) {
  const [pending, start] = useTransition();
  const [respondendo, setRespondendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const acao = (fn: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      setErro(null);
      const res = await fn();
      if (res && "error" in res && res.error) setErro(res.error);
    });

  const botao =
    "inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors disabled:opacity-50";

  return (
    <div className="border border-linen-200 bg-linen-50 p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars value={review.rating} />
        <span className="text-sm text-ink">{review.author_name}</span>
        {review.verified_purchase && (
          <span className="rounded bg-success/15 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-success">
            compra verificada
          </span>
        )}
        <span
          className={
            review.status === "approved"
              ? "rounded bg-success/15 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-success"
              : review.status === "rejected"
                ? "rounded bg-danger/10 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-danger"
                : "rounded bg-warning/15 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-warning"
          }
        >
          {review.status === "approved"
            ? "publicada"
            : review.status === "rejected"
              ? "recusada"
              : "aguardando"}
        </span>
        <span className="ml-auto text-xs text-linen-500">
          {dataHoraBR(review.created_at)}
        </span>
      </div>

      {review.product_slug ? (
        <Link
          href={`/produto/${review.product_slug}`}
          target="_blank"
          className="mt-2 inline-block text-xs text-linen-600 underline hover:text-champagne-700"
        >
          {review.product_name}
        </Link>
      ) : null}

      {review.title ? (
        <h3 className="mt-3 text-base text-ink">{review.title}</h3>
      ) : null}
      {review.body ? (
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-linen-700">
          {review.body}
        </p>
      ) : null}

      {review.reply ? (
        <div className="mt-4 border-l-2 border-champagne-400 bg-linen-100 px-4 py-3">
          <p className="text-[0.625rem] uppercase tracking-[0.12em] text-linen-600">
            Sua resposta
          </p>
          <p className="mt-1.5 text-sm text-linen-700">{review.reply}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {review.status !== "approved" && (
          <button
            disabled={pending}
            onClick={() => acao(() => setReviewStatus(review.id, "approved"))}
            className={`${botao} border-success/40 text-success hover:bg-success/10`}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Publicar
          </button>
        )}
        {review.status !== "rejected" && (
          <button
            disabled={pending}
            onClick={() => acao(() => setReviewStatus(review.id, "rejected"))}
            className={`${botao} border-danger/40 text-danger hover:bg-danger/10`}
          >
            <X className="h-3.5 w-3.5" /> Recusar
          </button>
        )}
        {review.status !== "pending" && (
          <button
            disabled={pending}
            onClick={() => acao(() => setReviewStatus(review.id, "pending"))}
            className={`${botao} border-linen-300 text-linen-700 hover:bg-linen-100`}
          >
            <Undo2 className="h-3.5 w-3.5" /> Voltar para a fila
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => setRespondendo((v) => !v)}
          className={`${botao} border-linen-300 text-linen-700 hover:bg-linen-100`}
        >
          <MessageSquareReply className="h-3.5 w-3.5" />
          {review.reply ? "Editar resposta" : "Responder"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir esta avaliação de vez? Não dá para desfazer.")) {
              acao(() => deleteReview(review.id));
            }
          }}
          className={`${botao} ml-auto border-transparent text-linen-500 hover:text-danger`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>

      {respondendo && (
        <form
          action={(fd) =>
            start(async () => {
              const res = await replyToReview(fd);
              if (res?.error) setErro(res.error);
              else setRespondendo(false);
            })
          }
          className="mt-4"
        >
          <input type="hidden" name="id" value={review.id} />
          <textarea
            name="reply"
            rows={3}
            defaultValue={review.reply ?? ""}
            placeholder="Responda como a loja. Aparece publicamente, abaixo da avaliação."
            className="w-full border border-linen-300 bg-linen-50 p-3 text-sm outline-none focus:border-champagne-600"
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-2 border border-linen-900 bg-linen-900 px-5 py-2 text-[0.625rem] uppercase tracking-[0.16em] text-linen-50 disabled:opacity-60"
          >
            Salvar resposta
          </button>
        </form>
      )}

      {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
    </div>
  );
}
