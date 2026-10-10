"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acaoEmLote } from "@/app/admin/(panel)/produtos/actions";

type Acao = "ativar" | "desativar" | "destacar" | "remover_destaque" | "reajustar";

/**
 * Barra de ações em lote da lista de produtos.
 *
 * A seleção vive aqui (não na URL) de propósito: marcar 20 produtos e trocar
 * de página perderia a seleção de qualquer jeito, e uma seleção que atravessa
 * páginas invisivelmente é pior — o admin aplicaria o lote sem ver tudo que
 * está dentro dele.
 */
export function ProductBulk({
  ids,
  selecionados,
  onChange,
}: {
  /** Ids visíveis na página atual, para o "selecionar tudo". */
  ids: string[];
  selecionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [acao, setAcao] = useState<Acao>("ativar");
  const [percentual, setPercentual] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const todosMarcados = ids.length > 0 && ids.every((id) => selecionados.includes(id));

  if (selecionados.length === 0) {
    return (
      <label className="flex items-center gap-2 text-sm text-linen-600">
        <input
          type="checkbox"
          checked={false}
          onChange={() => onChange(ids)}
          className="accent-champagne-600"
        />
        Selecionar os <span className="numeral">{ids.length}</span> desta página
      </label>
    );
  }

  const rotulo: Record<Acao, string> = {
    ativar: `Ativar ${selecionados.length}`,
    desativar: `Desativar ${selecionados.length}`,
    destacar: `Destacar ${selecionados.length}`,
    remover_destaque: `Tirar destaque de ${selecionados.length}`,
    reajustar: `Reajustar ${selecionados.length}`,
  };

  return (
    <div className="rounded border border-champagne-600/30 bg-linen-100 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={todosMarcados}
            onChange={() => onChange(todosMarcados ? [] : ids)}
            className="accent-champagne-600"
          />
          <span className="numeral">{selecionados.length}</span> selecionado{selecionados.length > 1 ? "s" : ""}
        </label>

        <select
          value={acao}
          onChange={(e) => {
            setAcao(e.target.value as Acao);
            setConfirmando(false);
          }}
          className="rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600"
        >
          <option value="ativar">Ativar</option>
          <option value="desativar">Desativar</option>
          <option value="destacar">Destacar na home</option>
          <option value="remover_destaque">Tirar destaque</option>
          <option value="reajustar">Reajustar preço (%)</option>
        </select>

        {acao === "reajustar" && (
          <input
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            placeholder="ex.: 10 ou -5"
            className="numeral w-28 rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600"
          />
        )}

        {confirmando ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await acaoEmLote(
                  selecionados,
                  acao,
                  acao === "reajustar" ? Number(percentual.replace(",", ".")) : undefined,
                );
                if (res?.error) setError(res.error);
                else {
                  onChange([]);
                  setConfirmando(false);
                  setPercentual("");
                  router.refresh();
                }
                setBusy(false);
              }}
              className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
            >
              {busy ? "Aplicando…" : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="rounded border border-champagne-600 px-4 py-2 text-xs text-champagne-700 transition-colors hover:bg-champagne-600 hover:text-linen-50"
          >
            {rotulo[acao]}
          </button>
        )}

        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-auto text-xs text-linen-600 hover:text-champagne-700"
        >
          limpar seleção
        </button>
      </div>

      {acao === "reajustar" && confirmando && (
        <p className="mt-2 text-xs text-linen-600">
          Produtos “sob consulta” (preço 0) ficam de fora — percentual sobre
          zero continuaria zero.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
