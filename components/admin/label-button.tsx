"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Truck } from "lucide-react";
import { gerarEtiqueta } from "@/app/admin/(panel)/pedidos/actions";

/**
 * Botão de gerar etiqueta.
 *
 * É client component só por causa do erro: antes a action lançava, o admin
 * caía numa tela genérica do Next e o motivo real (CPF do remetente faltando,
 * saldo insuficiente, serviço indisponível) nunca aparecia — daí a sensação
 * de que o botão "não faz nada".
 */
export function LabelButton({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pago = status === "paid" || status === "shipped";

  return (
    <div className="mt-3">
      {!pago && (
        <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pedido ainda não pago. Gerar etiqueta compra o frete com o saldo do
          Melhor Envio.
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const fd = new FormData();
          fd.append("id", orderId);
          const res = await gerarEtiqueta(fd);
          if (res?.error) setError(res.error);
          else router.refresh();
          setBusy(false);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-champagne-600 py-2 font-semibold text-champagne-700 hover:bg-champagne-600 hover:text-white disabled:opacity-60"
      >
        <Truck className="h-4 w-4" />
        {busy ? "Gerando…" : "Gerar etiqueta Melhor Envio"}
      </button>

      {error && (
        <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      )}

      <p className="mt-2 text-xs text-linen-500">
        Compra e gera a etiqueta com o saldo da conta Melhor Envio. Precisa de
        origem completa (com CNPJ) em Configurações → Frete.
      </p>
    </div>
  );
}
