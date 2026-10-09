"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { saveHomeSections } from "@/app/admin/(panel)/home/actions";
import type { HomeSection } from "@/lib/store-defaults";

const DESC: Record<string, string> = {
  featured: "Produtos marcados como “destaque” no cadastro do produto.",
  bestsellers: "Itens compráveis priorizados (placeholder até haver dados de vendas).",
  promotions: "Produtos com preço comparativo (preço “de/por”) — ou seja, em oferta.",
  newarrivals: "Produtos mais recentes, pela data de cadastro.",
};

export function HomeSectionsEditor({ initial }: { initial: HomeSection[] }) {
  const [sections, setSections] = useState<HomeSection[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(i: number, field: keyof HomeSection, value: string | boolean) {
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, [field]: value } : sec)));
  }
  function move(i: number, dir: number) {
    setSections((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveHomeSections(sections);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-linen-300 px-3 py-2 text-sm outline-none focus:border-champagne-600";

  return (
    <div className="max-w-2xl space-y-3">
      {sections.map((s, i) => (
        <div
          key={s.key}
          className={`rounded border bg-linen-50 p-4 ${s.enabled ? "border-linen-200" : "border-dashed border-linen-300 opacity-70"}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex flex-col pt-1">
              <button type="button" onClick={() => move(i, -1)} className="text-linen-500 hover:text-champagne-700">↑</button>
              <GripVertical className="h-4 w-4 text-linen-300" />
              <button type="button" onClick={() => move(i, 1)} className="text-linen-500 hover:text-champagne-700">↓</button>
            </div>
            <div className="flex-1">
              <input
                className={input}
                value={s.title}
                onChange={(e) => update(i, "title", e.target.value)}
                placeholder="Título da seção"
              />
              <p className="mt-1 text-xs text-linen-600">{DESC[s.key] ?? ""}</p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-2 text-sm text-linen-600">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => update(i, "enabled", e.target.checked)}
                className="h-4 w-4 accent-champagne-600"
              />
              {s.enabled ? "Visível" : "Oculta"}
            </label>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-champagne-600 px-6 py-2 text-sm font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar seções"}
        </button>
        {saved && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
