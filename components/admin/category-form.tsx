"use client";

import { useState } from "react";
import { CATEGORY_TYPE_LABEL, type CategoryType } from "@/lib/types";
import { saveCategory } from "@/app/admin/(panel)/categorias/actions";
import type { Category } from "@/lib/types";
import { ImageField } from "@/components/admin/image-field";

const FORMATOS = (Object.keys(CATEGORY_TYPE_LABEL) as CategoryType[]).map((value) => ({
  value,
  label: CATEGORY_TYPE_LABEL[value],
}));

export function CategoryForm({
  category,
  parents,
}: {
  category?: Category | null;
  parents: Category[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagem, setImagem] = useState(category?.image_url ?? "");
  // O formato só aparece quando a categoria é de topo, então o select de pai
  // precisa ser controlado.
  const [paiId, setPaiId] = useState(category?.parent_id ?? "");

  // Uma categoria não pode ser pai de si mesma NEM de quem está abaixo dela —
  // isso criaria um ciclo e o menu da loja entraria em recursão infinita.
  const descendentes = new Set<string>();
  if (category?.id) {
    descendentes.add(category.id);
    let cresceu = true;
    while (cresceu) {
      cresceu = false;
      for (const c of parents) {
        if (c.parent_id && descendentes.has(c.parent_id) && !descendentes.has(c.id)) {
          descendentes.add(c.id);
          cresceu = true;
        }
      }
    }
  }

  // Ordena topo → filhos, para o select refletir a árvore real.
  const options = parents
    .filter((p) => !descendentes.has(p.id))
    .map((p) => ({
      ...p,
      nivel: p.parent_id ? 1 : 0,
      caminho: p.parent_id
        ? `${parents.find((x) => x.id === p.parent_id)?.name ?? "?"} › ${p.name}`
        : p.name,
    }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho, "pt-BR"));

  const input = "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        // Sem try/catch: no sucesso a action redireciona, e um catch aqui
        // engoliria a navegação. Erro vem no retorno, não por exceção.
        const res = await saveCategory(fd);
        if (res?.error) setError(res.error);
        setSaving(false);
      }}
      className="max-w-2xl space-y-6"
    >
      {category?.id && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="image_url" value={imagem} />

      <div className="rounded border border-linen-200 bg-linen-50 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Nome *</label>
            <input name="name" required defaultValue={category?.name} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Slug (URL)</label>
            <input
              name="slug"
              defaultValue={category?.slug}
              placeholder="gerado a partir do nome se vazio"
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Onde esta categoria fica</label>
            <select
              name="parent_id"
              value={paiId}
              onChange={(e) => setPaiId(e.target.value)}
              className={input}
            >
              <option value="">É uma categoria principal (aparece no menu)</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  Dentro de {t.caminho}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-linen-600">
              Para reorganizar várias de uma vez, use a árvore em Categorias.
            </p>
          </div>
          {/* O formato só é escolhido na categoria principal; dentro dela,
              toda subcategoria herda — uma subcategoria de "Difusores" é
              difusor por definição. */}
          {paiId === "" && (
            <div className="sm:col-span-2">
              <label className={label}>Formato do produto</label>
              <select name="type" defaultValue={category?.type ?? "difusor"} className={input}>
                {FORMATOS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className={label}>Descrição (aparece no topo da categoria)</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={category?.description ?? ""}
              placeholder="Uma ou duas frases sobre este formato."
              className={input}
            />
          </div>
          <div>
            <label className={label}>Posição (ordem)</label>
            <input name="position" type="number" defaultValue={category?.position ?? 0} className={`numeral ${input}`} />
          </div>
          <div className="flex items-center pt-7">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-linen-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={category ? category.is_active : true}
                className="h-4 w-4 accent-champagne-600"
              />
              Categoria ativa
            </label>
          </div>
        </div>
      </div>

      <div className="rounded border border-linen-200 bg-linen-50 p-5">
        <h3 className="mb-3 font-display text-lg text-ink">Imagem (opcional)</h3>
        <ImageField
          label="Imagem da categoria"
          value={imagem}
          onChange={setImagem}
          folder="categories"
          spec="categoria"
        />
      </div>

      {error && (
        <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button
        disabled={saving}
        className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
      >
        {saving ? "Salvando…" : "Salvar categoria"}
      </button>
    </form>
  );
}
