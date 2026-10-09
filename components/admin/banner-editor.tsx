"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { saveBanners, type BannerSlide } from "@/app/admin/(panel)/banners/actions";
import { ImageField } from "@/components/admin/image-field";

const EMPTY: BannerSlide = {
  bg: "",
  image: "",
  eyebrow: "",
  title: "",
  subtitle: "",
  ctaLabel: "Ver mais",
  ctaHref: "/produtos",
};

export function BannerEditor({ initial }: { initial: BannerSlide[] }) {
  const [slides, setSlides] = useState<BannerSlide[]>(initial.length ? initial : []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(i: number, field: keyof BannerSlide, value: string) {
    setSlides((s) => s.map((sl, idx) => (idx === i ? { ...sl, [field]: value } : sl)));
  }
  function remove(i: number) {
    setSlides((s) => s.filter((_, idx) => idx !== i));
  }
  function add() {
    setSlides((s) => [...s, { ...EMPTY }]);
  }
  function move(i: number, dir: number) {
    setSlides((s) => {
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
      await saveBanners(slides);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-linen-300 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1 block text-xs font-medium text-linen-600";

  return (
    <div className="space-y-4">
      {slides.length === 0 && (
        <p className="rounded-lg border border-dashed border-linen-300 p-6 text-center text-sm text-linen-600">
          Nenhum banner. Sem banners cadastrados, a home usa o slide padrão da marca + destaques.
        </p>
      )}

      {slides.map((s, i) => (
        <div key={i} className="rounded border border-linen-200 bg-linen-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <GripVertical className="h-4 w-4 text-linen-300" /> Slide {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => move(i, -1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↑</button>
              <button onClick={() => move(i, 1)} className="rounded px-2 py-1 text-xs text-linen-600 hover:bg-linen-100">↓</button>
              <button onClick={() => remove(i)} className="p-1.5 text-linen-500 hover:text-champagne-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ImageField
                label="Imagem de fundo (atrás do texto)"
                spec="banner_fundo"
                value={s.bg}
                onChange={(url) => update(i, "bg", url)}
              />
            </div>
            <div className="sm:col-span-2">
              <ImageField
                label="Imagem do produto (card à direita)"
                spec="banner_produto"
                value={s.image}
                onChange={(url) => update(i, "image", url)}
              />
            </div>
            <div>
              <label className={label}>Tag (eyebrow)</label>
              <input className={input} value={s.eyebrow} onChange={(e) => update(i, "eyebrow", e.target.value)} placeholder="Ex.: Multimídia" />
            </div>
            <div>
              <label className={label}>Título *</label>
              <input className={input} value={s.title} onChange={(e) => update(i, "title", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Subtítulo</label>
              <input className={input} value={s.subtitle} onChange={(e) => update(i, "subtitle", e.target.value)} />
            </div>
            <div>
              <label className={label}>Texto do botão</label>
              <input className={input} value={s.ctaLabel} onChange={(e) => update(i, "ctaLabel", e.target.value)} />
            </div>
            <div>
              <label className={label}>Link do botão</label>
              <input className={input} value={s.ctaHref} onChange={(e) => update(i, "ctaHref", e.target.value)} placeholder="/categoria/coding" />
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button onClick={add} className="inline-flex items-center gap-2 rounded-lg border border-linen-300 px-4 py-2 text-sm font-semibold text-ink hover:border-champagne-500">
          <Plus className="h-4 w-4" /> Adicionar slide
        </button>
        <button onClick={handleSave} disabled={saving} className="rounded-lg bg-champagne-600 px-6 py-2 text-sm font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar banners"}
        </button>
        {saved && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
