"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveMiniBanners } from "@/app/admin/(panel)/banners/actions";
import { DEFAULT_MINI_BANNERS, type MiniBanner } from "@/lib/store-defaults";
import { ImageField } from "@/components/admin/image-field";

const EMPTY: MiniBanner = { label: "", href: "", image: "" };

export function MiniBannerEditor({ initial }: { initial: MiniBanner[] | null }) {
  const [items, setItems] = useState<MiniBanner[]>(initial?.length ? initial : DEFAULT_MINI_BANNERS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(i: number, field: keyof MiniBanner, value: string) {
    setItems((s) => s.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  }
  function remove(i: number) {
    setItems((s) => s.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: number) {
    setItems((s) => {
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
      await saveMiniBanners(items);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-linen-300 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1 block text-xs font-medium text-linen-600";

  return (
    <div className="space-y-4">
      {items.map((b, i) => (
        <div key={i} className="rounded border border-linen-200 bg-linen-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Mini banner {i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↑</button>
              <button type="button" onClick={() => move(i, 1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↓</button>
              <button type="button" onClick={() => remove(i)} className="p-1.5 text-linen-500 hover:text-champagne-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Texto *</label>
              <input className={input} value={b.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Ex.: Multimídia & Som" />
            </div>
            <div>
              <label className={label}>Link *</label>
              <input className={input} value={b.href} onChange={(e) => update(i, "href", e.target.value)} placeholder="/categoria/pecas-multimidia" />
            </div>
            <div className="sm:col-span-2">
              <ImageField
                label="Imagem"
                spec="mini_banner"
                value={b.image}
                onChange={(url) => update(i, "image", url)}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setItems((s) => [...s, { ...EMPTY }])} className="inline-flex items-center gap-2 rounded-lg border border-linen-300 px-4 py-2 text-sm font-semibold text-ink hover:border-champagne-500">
          <Plus className="h-4 w-4" /> Adicionar mini banner
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-champagne-600 px-6 py-2 text-sm font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar mini banners"}
        </button>
        {saved && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
