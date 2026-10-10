"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, ExternalLink } from "lucide-react";
import Link from "next/link";
import { saveFaq } from "@/app/admin/(panel)/paginas/actions";

interface Item {
  question: string;
  answer: string;
}

export function FaqEditor({ initial }: { initial: Item[] }) {
  const [itens, setItens] = useState<Item[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";

  function update(i: number, campo: keyof Item, valor: string) {
    setItens((s) => s.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  }
  function mover(i: number, dir: number) {
    setItens((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copia = [...s];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  return (
    <div className="rounded border border-linen-200 bg-linen-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-ink">
          Perguntas frequentes{" "}
          <span className="numeral text-sm text-linen-500">({itens.length})</span>
        </h2>
        <Link
          href="/faq"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-linen-600 hover:text-champagne-700"
        >
          /faq <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {itens.map((item, i) => (
          <div key={i} className="rounded border border-linen-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700">
                <GripVertical className="h-3.5 w-3.5 text-linen-300" /> Pergunta <span className="numeral">{i + 1}</span>
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => mover(i, -1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↑</button>
                <button type="button" onClick={() => mover(i, 1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↓</button>
                <button
                  type="button"
                  onClick={() => setItens((s) => s.filter((_, idx) => idx !== i))}
                  aria-label="Remover pergunta"
                  className="p-1.5 text-linen-500 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              value={item.question}
              onChange={(e) => update(i, "question", e.target.value)}
              placeholder="Pergunta"
              className={`${input} mb-2`}
            />
            <textarea
              value={item.answer}
              onChange={(e) => update(i, "answer", e.target.value)}
              placeholder="Resposta"
              rows={3}
              className={input}
            />
          </div>
        ))}
        {itens.length === 0 && (
          <p className="rounded border border-dashed border-linen-300 p-6 text-center text-sm text-linen-600">
            Sem perguntas. A loja mostra a lista padrão até você cadastrar as suas — comece pelas dúvidas de prazo de entrega, troca e uso dos difusores.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setItens((s) => [...s, { question: "", answer: "" }])}
          className="inline-flex items-center gap-2 rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
        >
          <Plus className="h-4 w-4" /> Adicionar pergunta
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            setSalvo(false);
            const res = await saveFaq(itens);
            if (res?.error) setError(res.error);
            else setSalvo(true);
            setSaving(false);
          }}
          className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar FAQ"}
        </button>
        {salvo && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
