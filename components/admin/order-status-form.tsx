"use client";

import { useActionState } from "react";
import { updateOrder } from "@/app/admin/(panel)/pedidos/actions";
import type { FormResult } from "@/lib/admin-form";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

const STATUSES = Object.keys(STATUS_LABEL);

/**
 * Situação do pedido: status, rastreio e nota interna.
 *
 * Virou componente de cliente só por causa do retorno. Antes era um
 * `<form action>` dentro da página: a action lançava exceção quando o banco
 * recusava, e o admin via a tela recarregar como se tivesse salvado. Com
 * `useActionState` o erro aparece onde a pessoa está olhando.
 */
export function OrderStatusForm({
  orderId,
  status,
  trackingCode,
  notes,
  comEtiqueta,
}: {
  orderId: string;
  status: string;
  trackingCode: string | null;
  notes: string | null;
  /** Rastreio veio do Melhor Envio — não se edita à mão. */
  comEtiqueta: boolean;
}) {
  const [resultado, acao, pendente] = useActionState<FormResult, FormData>(
    async (_anterior, formData) => updateOrder(formData),
    undefined,
  );

  const rotulo =
    "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const campo =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";

  return (
    <form action={acao} className="rounded border border-linen-200 bg-linen-50 p-5">
      <input type="hidden" name="id" value={orderId} />
      <h2 className="font-display mb-3 text-lg text-ink">Situação</h2>

      <label className={rotulo} htmlFor="status">
        Status
      </label>
      <select id="status" name="status" defaultValue={status} className={`mb-4 ${campo}`}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <label className={rotulo} htmlFor="tracking_code">
        Código de rastreio
      </label>
      <input
        id="tracking_code"
        name="tracking_code"
        defaultValue={trackingCode ?? ""}
        readOnly={comEtiqueta}
        className={`mb-1 ${campo} read-only:bg-linen-100 read-only:text-linen-600`}
      />
      <p className="mb-4 text-xs text-linen-500">
        {comEtiqueta
          ? "Veio da etiqueta do Melhor Envio."
          : "Preencha se despachou por fora do Melhor Envio."}
      </p>

      {/* Nota interna: some da vista do cliente. É onde o combinado por
          WhatsApp para de viver só no WhatsApp. */}
      <label className={rotulo} htmlFor="notes">
        Nota interna
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={3}
        defaultValue={notes ?? ""}
        placeholder="Cliente pediu para trocar o endereço…"
        className={`mb-1 ${campo}`}
      />
      <p className="mb-4 text-xs text-linen-500">Só você vê. Não vai em e-mail nenhum.</p>

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700 disabled:opacity-60"
      >
        {pendente ? "Salvando…" : "Salvar"}
      </button>

      <p className="mt-2 text-xs text-linen-500">
        O cliente só recebe e-mail quando o status muda — ou quando você
        preenche o rastreio de um pedido já enviado. Nota interna nunca
        dispara nada.
      </p>

      {resultado?.error ? (
        <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {resultado.error}
        </p>
      ) : null}
    </form>
  );
}
