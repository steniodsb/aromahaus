"use client";

import { useState } from "react";
import { savePromoBanner } from "@/app/admin/(panel)/banners/actions";
import { DEFAULT_PROMO, type PromoBanner } from "@/lib/store-defaults";
import { ImageField } from "@/components/admin/image-field";

export function PromoBannerEditor({ initial }: { initial: PromoBanner | null }) {
  const [p, setP] = useState<PromoBanner>(initial ?? DEFAULT_PROMO);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof PromoBanner>(field: K, value: PromoBanner[K]) {
    setP((s) => ({ ...s, [field]: value }));
  }
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await savePromoBanner(p);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";

  return (
    <div className="rounded border border-linen-200 bg-linen-50 p-4">
      <label className="mb-4 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={p.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 accent-champagne-600" />
        Exibir banner promocional na home
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ImageField
            label="Imagem"
            value={p.image}
            onChange={(url) => set("image", url)}
            spec="promo"
          />
        </div>
        <div>
          <label className={label}>Etiqueta acima do título</label>
          <input className={input} value={p.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="Edição limitada" />
        </div>
        <div>
          <label className={label}>Título *</label>
          <input className={input} value={p.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className={label}>Texto do botão</label>
          <input className={input} value={p.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} />
        </div>
        <div>
          <label className={label}>Link do botão</label>
          <input className={input} value={p.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} placeholder="/produtos" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700 disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar banner promocional"}
        </button>
        {saved && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
