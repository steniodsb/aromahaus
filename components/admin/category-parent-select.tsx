"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCategoryParent } from "@/app/admin/(panel)/categorias/actions";

export interface OpcaoPai {
  id: string;
  /** "Pai › Filho" — sem o caminho, dois "Volkswagen" na lista são iguais. */
  caminho: string;
  /** 0 = topo, 1 = já é filha de alguém. Só controla a indentação. */
  nivel: number;
}

/**
 * Seletor de categoria pai direto na listagem.
 *
 * Salva ao mudar, sem botão: é uma decisão de um campo só, e abrir o cadastro
 * inteiro para trocar o pai de 26 categorias era o que tornava reorganizar a
 * árvore inviável.
 */
export function CategoryParentSelect({
  id,
  parentId,
  opcoes,
}: {
  id: string;
  parentId: string | null;
  opcoes: OpcaoPai[];
}) {
  const router = useRouter();
  const [valor, setValor] = useState(parentId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <select
        value={valor}
        disabled={busy}
        onChange={async (e) => {
          const novo = e.target.value;
          const anterior = valor;
          setValor(novo);
          setBusy(true);
          setError(null);

          const res = await setCategoryParent(id, novo || null);
          if (res?.error) {
            setError(res.error);
            setValor(anterior); // desfaz na tela para não mentir sobre o estado
          } else {
            router.refresh();
          }
          setBusy(false);
        }}
        className="w-full max-w-[15rem] rounded-lg border border-linen-300 bg-linen-50 px-2 py-1 text-sm outline-none focus:border-champagne-600 disabled:opacity-50"
      >
        <option value="">— nenhuma (topo) —</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nivel > 0 ? `  ↳ ${o.caminho}` : o.caminho}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-champagne-700">{error}</p>}
    </div>
  );
}
