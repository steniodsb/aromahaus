"use client";

import { X } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { formatBRL } from "@/lib/utils";

/**
 * Aviso do que mudou na sacola desde a última visita.
 *
 * O carrinho fica no navegador e o preço, no banco. Entre uma visita e outra
 * a promoção acaba, o estoque cai e o produto sai do ar — e o cliente não tem
 * como saber. Sem este bloco, a primeira notícia que ele recebe é um total
 * diferente do que tinha somado, já na hora de pagar.
 */
export function CartChanges() {
  const { changes, dismissChanges } = useCart();
  if (!changes.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-8 border border-champagne-500 bg-champagne-200/35 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-champagne-700">Sua sacola foi atualizada</p>
          <ul className="mt-3 space-y-1.5 text-sm text-linen-700">
            {changes.map((c) => (
              <li key={`${c.id}-${c.tipo}`}>
                {c.tipo === "preco" && (
                  <>
                    <strong className="font-medium text-ink">{c.name}</strong>{" "}
                    {Number(c.para) > Number(c.de) ? "subiu" : "baixou"} de{" "}
                    <span className="numeral line-through">{formatBRL(Number(c.de))}</span>{" "}
                    para <span className="numeral text-ink">{formatBRL(Number(c.para))}</span>.
                  </>
                )}
                {c.tipo === "estoque" && (
                  <>
                    <strong className="font-medium text-ink">{c.name}</strong> — só
                    temos {c.qty}{" "}
                    {c.qty === 1 ? "unidade" : "unidades"} agora, e a quantidade
                    foi ajustada.
                  </>
                )}
                {c.tipo === "indisponivel" && (
                  <>
                    <strong className="font-medium text-ink">{c.name}</strong> saiu
                    do ar ou esgotou, e foi removido da sacola.
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-linen-600">
            Os valores abaixo já são os de agora. Nada foi cobrado.
          </p>
        </div>
        <button
          type="button"
          onClick={dismissChanges}
          aria-label="Fechar aviso"
          className="shrink-0 p-1 text-linen-600 transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
