"use client";

import { useState } from "react";
import { X, FolderPlus, CornerDownRight } from "lucide-react";
import type { Category } from "@/lib/types";

/** Mesma regra do servidor — serve só para mostrar o endereço antes de criar. */
function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ModoCriacao = "principal" | "subcategoria";

/**
 * Diálogo de criação de categoria.
 *
 * Antes a criação era um link tracejado escondido no rodapé de cada card —
 * quem chegava na tela não achava por onde começar. Agora são dois botões no
 * topo, e criar subcategoria pede explicitamente a principal em vez de
 * depender de onde a pessoa clicou.
 */
export function CategoryCreateDialog({
  modo,
  principais,
  paiInicial,
  pending,
  onCriar,
  onFechar,
}: {
  modo: ModoCriacao;
  principais: Category[];
  /** Pré-selecionada quando o clique veio de dentro de uma principal. */
  paiInicial?: string | null;
  pending: boolean;
  onCriar: (nome: string, parentId: string | null) => void;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [pai, setPai] = useState(paiInicial ?? "");
  const [tocouPai, setTocouPai] = useState(false);

  const ehSub = modo === "subcategoria";
  const faltaPai = ehSub && !pai;
  const podeCriar = nome.trim() && !faltaPai;
  const slug = slugify(nome);

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg rounded bg-linen-50 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl text-ink">
            {ehSub ? (
              <CornerDownRight className="h-5 w-5 text-champagne-700" />
            ) : (
              <FolderPlus className="h-5 w-5 text-champagne-700" />
            )}
            {ehSub ? "Nova subcategoria" : "Nova categoria principal"}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 text-linen-500 hover:bg-linen-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-5 text-sm text-linen-600">
          {ehSub
            ? "Fica dentro de uma categoria principal e aparece no submenu da loja."
            : "Aparece direto no menu da loja, como Difusores ou Home sprays."}
        </p>

        {ehSub && (
          <div className="mb-4">
            <label className={label}>Dentro de qual categoria principal? *</label>
            <select
              value={pai}
              autoFocus
              onChange={(e) => {
                setPai(e.target.value);
                setTocouPai(true);
              }}
              onBlur={() => setTocouPai(true)}
              className={`${input} ${faltaPai && tocouPai ? "border-danger" : ""}`}
            >
              <option value="">— escolha a principal —</option>
              {principais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {faltaPai && tocouPai && (
              <p className="mt-1 text-xs text-danger">
                Escolha onde ela vai ficar.
              </p>
            )}
            {principais.length === 0 && (
              <p className="mt-1 text-xs text-warning">
                Ainda não existe categoria principal. Crie uma primeiro.
              </p>
            )}
          </div>
        )}

        <div className="mb-5">
          <label className={label}>Nome *</label>
          <input
            value={nome}
            autoFocus={!ehSub}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && podeCriar) onCriar(nome, ehSub ? pai : null);
              if (e.key === "Escape") onFechar();
            }}
            placeholder={ehSub ? "Ex.: Refis" : "Ex.: Difusores de varetas"}
            className={input}
          />
          {slug && (
            <p className="mt-1 text-xs text-linen-600">
              Endereço na loja:{" "}
              <span className="font-mono text-linen-700">/categoria/{slug}</span>
              {/* O servidor prefixa com a principal se este endereço já existir —
                  acontece quando o mesmo nome (ex.: "Refis") existe em mais de uma principal. */}
              <span className="block text-linen-500">
                Se já existir uma categoria com esse endereço, ele ganha o nome
                da principal na frente.
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending || !podeCriar}
            onClick={() => onCriar(nome, ehSub ? pai : null)}
            className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700 disabled:opacity-50"
          >
            {pending ? "Criando…" : ehSub ? "Criar subcategoria" : "Criar categoria principal"}
          </button>
          <button
            type="button"
            onClick={onFechar}
            className="rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
