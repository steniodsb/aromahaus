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
    "w-full rounded-lg border border-linen-300 px-3 py-2 text-sm outline-none focus:border-champagne-600";

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
        <h2 className="font-semibold text-ink">
          Perguntas frequentes{" "}
          <span className="text-sm font-normal text-linen-500">({itens.length})</span>
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
          <div key={i} className="rounded-lg border border-linen-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-linen-600">
                <GripVertical className="h-3.5 w-3.5 text-linen-300" /> Pergunta {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => mover(i, -1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↑</button>
                <button type="button" onClick={() => mover(i, 1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↓</button>
                <button
                  type="button"
                  onClick={() => setItens((s) => s.filter((_, idx) => idx !== i))}
                  aria-label="Remover pergunta"
                  className="p-1.5 text-linen-500 hover:text-champagne-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              value={item.question}
              onChange={(e) => update(i, "question", e.target.value)}
              placeholder="Pergunta"
              className={`${input} mb-2 font-medium`}
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
          <p className="rounded-lg border border-dashed border-linen-300 p-6 text-center text-sm text-linen-600">
            Sem perguntas. A loja mostra a lista padrão até você cadastrar as suas.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setItens((s) => [...s, { question: "", answer: "" }])}
          className="inline-flex items-center gap-2 rounded-lg border border-linen-300 px-4 py-2 text-sm font-semibold text-ink hover:border-champagne-500"
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
          className="rounded-lg bg-champagne-600 px-6 py-2 text-sm font-semibold text-white hover:bg-champagne-700 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar FAQ"}
        </button>
        {salvo && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
