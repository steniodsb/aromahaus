"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, AlertTriangle } from "lucide-react";
import { estornarPedido } from "@/app/admin/(panel)/pedidos/actions";
import { formatBRL } from "@/lib/utils";

/**
 * Estorno pelo painel.
 *
 * Confirmação em dois passos de propósito: devolver dinheiro é irreversível
 * pelo lado da loja — depois de estornado, não existe "desfazer" no Mercado
 * Pago.
 */
export function RefundButton({
  orderId,
  total,
  status,
}: {
  orderId: string;
  total: number;
  status: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const podeEstornar = ["paid", "shipped", "delivered"].includes(status);
  if (!podeEstornar) return null;

  const parcial = Number(valor.replace(",", "."));
  const ehParcial = valor.trim() !== "" && Number.isFinite(parcial) && parcial < total;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-linen-300 py-2 text-sm font-semibold text-linen-700 hover:border-champagne-500 hover:text-champagne-700"
      >
        <Undo2 className="h-4 w-4" /> Estornar pagamento
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-warning/10 p-3">
      <p className="mb-2 flex items-start gap-1.5 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Devolve o dinheiro pelo Mercado Pago, no mesmo meio que o cliente pagou.
        Não tem como desfazer.
      </p>

      <label className="mb-1 block text-xs font-medium text-linen-700">
        Valor (vazio = total de {formatBRL(total)})
      </label>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={total.toFixed(2)}
        className="mb-2 w-full rounded-lg border border-linen-300 px-2 py-1 text-sm outline-none focus:border-champagne-600"
      />

      {ehParcial && (
        <p className="mb-2 text-xs text-linen-600">
          Estorno parcial: o pedido continua como{" "}
          <strong>{status === "paid" ? "pago" : status}</strong> e o estoque não volta.
        </p>
      )}

      {error && <p className="mb-2 text-xs text-champagne-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const fd = new FormData();
            fd.append("id", orderId);
            if (valor.trim()) fd.append("amount", valor);
            const res = await estornarPedido(fd);
            if (res?.error) setError(res.error);
            else {
              setAberto(false);
              router.refresh();
            }
            setBusy(false);
          }}
          className="flex-1 rounded-lg bg-champagne-600 py-2 text-sm font-semibold text-white hover:bg-champagne-700 disabled:opacity-60"
        >
          {busy ? "Estornando…" : ehParcial ? `Estornar ${formatBRL(parcial)}` : "Estornar tudo"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setError(null);
          }}
          className="rounded-lg border border-linen-300 px-3 py-2 text-sm text-linen-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
