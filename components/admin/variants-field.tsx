"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ProductVariant } from "@/lib/types";

/** Linha do editor. Tudo texto: o parsing acontece no servidor, uma vez só. */
export interface VariantDraft {
  id: string | null;
  label: string;
  volume_ml: string;
  sku: string;
  price: string;
  compare_at_price: string;
  stock: string;
  weight_g: string;
  width_cm: string;
  height_cm: string;
  length_cm: string;
  is_active: boolean;
}

const EMPTY: VariantDraft = {
  id: null,
  label: "",
  volume_ml: "",
  sku: "",
  price: "",
  compare_at_price: "",
  stock: "0",
  weight_g: "",
  width_cm: "",
  height_cm: "",
  length_cm: "",
  is_active: true,
};

const str = (v: unknown) => (v == null ? "" : String(v));

/**
 * Editor de tamanhos do produto.
 *
 * Existe porque difusor tem 250 ml e 500 ml, e os dois não compartilham preço,
 * peso nem estoque — são três números diferentes por tamanho, e tratar isso
 * como dois produtos separados obrigaria o cliente a adivinhar qual página é a
 * do frasco grande.
 *
 * **Sem nenhuma linha, o produto vende pelo preço e estoque dele mesmo.** É o
 * caso de sabonete, home spray e refil, que têm um tamanho só: forçar uma
 * variante neles deixaria a página com um seletor de uma opção.
 *
 * As linhas viajam como um JSON num campo escondido. O servidor é quem compara
 * com o que está no banco e decide o que criar, atualizar e apagar.
 */
export function VariantsField({
  initial,
  productPrice,
}: {
  initial: ProductVariant[];
  /** Mostrado como referência quando não há nenhum tamanho. */
  productPrice?: number | null;
}) {
  const [rows, setRows] = useState<VariantDraft[]>(() =>
    initial.map((v) => ({
      id: v.id,
      label: v.label,
      volume_ml: str(v.volume_ml),
      sku: str(v.sku),
      price: str(v.price),
      compare_at_price: str(v.compare_at_price),
      stock: str(v.stock ?? 0),
      weight_g: str(v.weight_g),
      width_cm: str(v.width_cm),
      height_cm: str(v.height_cm),
      length_cm: str(v.length_cm),
      is_active: v.is_active,
    })),
  );

  const set = (i: number, patch: Partial<VariantDraft>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-2 py-1.5 text-sm outline-none focus:border-champagne-600";
  const head = "text-[0.625rem] uppercase tracking-[0.1em] text-linen-600";

  return (
    <div>
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />

      {rows.length === 0 ? (
        <p className="text-xs leading-relaxed text-linen-600">
          Este produto é vendido em um tamanho só, pelo preço e estoque acima
          {productPrice ? ` (R$ ${productPrice})` : ""}. Adicione tamanhos apenas
          se ele tiver mais de uma medida — como o difusor de 250 ml e 500 ml.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r, i) => (
            <div key={r.id ?? `novo-${i}`} className="border border-line p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-linen-700">
                  <input
                    type="checkbox"
                    checked={r.is_active}
                    onChange={(e) => set(i, { is_active: e.target.checked })}
                    className="h-3.5 w-3.5 accent-champagne-600"
                  />
                  Ativo na loja
                </label>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  className="inline-flex items-center gap-1.5 text-xs text-danger hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Remover
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="sm:col-span-1">
                  <span className={head}>Tamanho *</span>
                  <input
                    value={r.label}
                    onChange={(e) => set(i, { label: e.target.value })}
                    placeholder="250 ml"
                    className={input}
                  />
                </label>
                <label>
                  <span className={head}>Volume (ml)</span>
                  <input
                    value={r.volume_ml}
                    onChange={(e) => set(i, { volume_ml: e.target.value })}
                    className={input}
                  />
                </label>
                <label>
                  <span className={head}>Preço (R$) *</span>
                  <input
                    value={r.price}
                    onChange={(e) => set(i, { price: e.target.value })}
                    className={input}
                  />
                </label>
                <label>
                  <span className={head}>De (R$)</span>
                  <input
                    value={r.compare_at_price}
                    onChange={(e) => set(i, { compare_at_price: e.target.value })}
                    className={input}
                  />
                </label>

                <label>
                  <span className={head}>Estoque</span>
                  <input
                    value={r.stock}
                    onChange={(e) => set(i, { stock: e.target.value })}
                    className={input}
                  />
                </label>
                <label>
                  <span className={head}>SKU</span>
                  <input
                    value={r.sku}
                    onChange={(e) => set(i, { sku: e.target.value })}
                    className={input}
                  />
                </label>
                <label>
                  <span className={head}>Peso (g)</span>
                  <input
                    value={r.weight_g}
                    onChange={(e) => set(i, { weight_g: e.target.value })}
                    className={input}
                  />
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <label>
                    <span className={head}>Larg</span>
                    <input
                      value={r.width_cm}
                      onChange={(e) => set(i, { width_cm: e.target.value })}
                      className={input}
                    />
                  </label>
                  <label>
                    <span className={head}>Alt</span>
                    <input
                      value={r.height_cm}
                      onChange={(e) => set(i, { height_cm: e.target.value })}
                      className={input}
                    />
                  </label>
                  <label>
                    <span className={head}>Comp</span>
                    <input
                      value={r.length_cm}
                      onChange={(e) => set(i, { length_cm: e.target.value })}
                      className={input}
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { ...EMPTY }])}
        className="mt-4 inline-flex items-center gap-2 border border-line px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Adicionar tamanho
      </button>

      {rows.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-linen-600">
          Com tamanhos cadastrados, a vitrine mostra “a partir de” com o menor
          preço, e o estoque e o frete passam a sair daqui — não dos campos de
          preço e estoque do produto.
        </p>
      )}
    </div>
  );
}
