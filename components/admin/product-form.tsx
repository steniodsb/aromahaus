"use client";

import { useState } from "react";
import { saveProduct } from "@/app/admin/(panel)/produtos/actions";
import type { Product, ProductVariant, Category } from "@/lib/types";
import { GalleryField } from "@/components/admin/gallery-field";
import { VariantsField } from "@/components/admin/variants-field";

/** Famílias que a casa usa. Texto livre no banco; aqui é só atalho. */
const FAMILIAS = [
  "Floral",
  "Amadeirado",
  "Cítrico",
  "Âmbar",
  "Fresco",
  "Herbal",
  "Gourmand",
  "Verde",
];

const AMBIENTES = [
  { value: "sala", label: "Sala" },
  { value: "quarto", label: "Quarto" },
  { value: "banheiro", label: "Banheiro" },
  { value: "lavabo", label: "Lavabo" },
  { value: "escritorio", label: "Escritório" },
  { value: "closet", label: "Closet" },
  { value: "cozinha", label: "Cozinha" },
  { value: "entrada", label: "Entrada" },
];

export function ProductForm({
  product,
  categories,
  variants = [],
}: {
  product?: Product | null;
  categories: Category[];
  variants?: ProductVariant[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        // Sem try/catch: no sucesso a action redireciona, e um catch aqui
        // engoliria a navegação. Erro vem no retorno, não por exceção.
        const res = await saveProduct(fd);
        if (res?.error) setError(res.error);
        setSaving(false);
      }}
      className="space-y-6"
    >
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <div className="mb-4">
              <label className={label}>Nome *</label>
              <input name="name" required defaultValue={product?.name} className={input} />
            </div>
            <div className="mb-4">
              <label className={label}>Slug (URL)</label>
              <input
                name="slug"
                defaultValue={product?.slug}
                placeholder="gerado a partir do nome se vazio"
                className={input}
              />
            </div>
            <div>
              <label className={label}>Descrição</label>
              <textarea
                name="description"
                rows={5}
                defaultValue={product?.description ?? ""}
                className={input}
              />
            </div>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-4 font-display text-lg text-ink">Preço e estoque</h3>
            <p className="mb-4 text-xs text-linen-600">
              Deixe o preço em branco (ou 0) para o produto aparecer como
              “Sob consulta” com botão de WhatsApp até você definir o valor.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Preço (R$)</label>
                <input name="price" type="text" defaultValue={product?.price ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Preço comparativo (R$)</label>
                <input name="compare_at_price" type="text" defaultValue={product?.compare_at_price ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Estoque</label>
                <input name="stock" type="number" defaultValue={product?.stock ?? 0} className={input} />
              </div>
              <div>
                <label className={label}>SKU</label>
                <input name="sku" defaultValue={product?.sku ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Custo (R$)</label>
                <input name="cost_price" type="text" defaultValue={product?.cost_price ?? ""} className={input} />
                <p className="mt-1 text-xs text-linen-600">
                  Só você vê. É o que permite o painel mostrar lucro, não só
                  faturamento.
                </p>
              </div>
              <div>
                <label className={label}>Avisar com estoque abaixo de</label>
                <input
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  defaultValue={product?.low_stock_threshold ?? 3}
                  className={input}
                />
                <p className="mt-1 text-xs text-linen-600">0 desliga o aviso.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              <div>
                <label className={label}>Peso (g)</label>
                <input name="weight_g" type="number" defaultValue={product?.weight_g ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Larg. (cm)</label>
                <input name="width_cm" type="text" defaultValue={product?.width_cm ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Alt. (cm)</label>
                <input name="height_cm" type="text" defaultValue={product?.height_cm ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Compr. (cm)</label>
                <input name="length_cm" type="text" defaultValue={product?.length_cm ?? ""} className={input} />
              </div>
            </div>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-1 font-display text-lg text-ink">Perfumaria</h3>
            <p className="mb-4 text-xs text-linen-600">
              É o que a página de produto usa para montar a pirâmide olfativa e
              o que os filtros da vitrine usam como faceta. Um produto sem estes
              campos continua vendendo — só não aparece nos filtros por
              fragrância, família e ambiente.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Fragrância</label>
                <input
                  name="fragrance"
                  defaultValue={product?.fragrance ?? ""}
                  placeholder="Âmbar Haus"
                  className={input}
                />
                <p className="mt-1 text-xs text-linen-600">
                  Escreva igual nos outros formatos: é por este texto que a loja
                  agrupa a mesma fragrância.
                </p>
              </div>
              <div>
                <label className={label}>Família olfativa</label>
                <input
                  name="olfactory_family"
                  list="familias-olfativas"
                  defaultValue={product?.olfactory_family ?? ""}
                  className={input}
                />
                <datalist id="familias-olfativas">
                  {FAMILIAS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label}>Notas de topo</label>
                <input
                  name="notes_top"
                  defaultValue={(product?.notes_top ?? []).join(", ")}
                  placeholder="Pimenta rosa, Bergamota"
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Notas de corpo</label>
                <input
                  name="notes_heart"
                  defaultValue={(product?.notes_heart ?? []).join(", ")}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Notas de fundo</label>
                <input
                  name="notes_base"
                  defaultValue={(product?.notes_base ?? []).join(", ")}
                  className={input}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-linen-600">Separe por vírgula.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Intensidade</label>
                <select
                  name="intensity"
                  defaultValue={product?.intensity ?? ""}
                  className={input}
                >
                  <option value="">— não informar —</option>
                  <option value="1">1 — muito discreta</option>
                  <option value="2">2 — discreta</option>
                  <option value="3">3 — equilibrada</option>
                  <option value="4">4 — marcante</option>
                  <option value="5">5 — muito marcante</option>
                </select>
              </div>
              <div>
                <label className={label}>Volume (ml)</label>
                <input
                  name="volume_ml"
                  type="number"
                  defaultValue={product?.volume_ml ?? ""}
                  className={input}
                />
                <p className="mt-1 text-xs text-linen-600">
                  Só para produto de tamanho único. Com tamanhos cadastrados
                  abaixo, cada um tem o seu.
                </p>
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className={label}>Combina com</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {AMBIENTES.map((a) => (
                  <label key={a.value} className="flex items-center gap-2 text-sm text-linen-700">
                    <input
                      type="checkbox"
                      name="rooms"
                      value={a.value}
                      defaultChecked={product?.rooms?.includes(a.value)}
                      className="h-3.5 w-3.5 accent-champagne-600"
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-1 font-display text-lg text-ink">Tamanhos</h3>
            <p className="mb-4 text-xs text-linen-600">
              Para produtos com mais de uma medida, como o difusor.
            </p>
            <VariantsField initial={variants} productPrice={product?.price ?? null} />
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-4 font-display text-lg text-ink">SEO</h3>
            <div className="mb-4">
              <label className={label}>Título SEO</label>
              <input name="seo_title" defaultValue={product?.seo_title ?? ""} className={input} />
            </div>
            <div>
              <label className={label}>Descrição SEO</label>
              <textarea name="seo_description" rows={2} defaultValue={product?.seo_description ?? ""} className={input} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-4 font-display text-lg text-ink">Organização</h3>
            <div className="mb-4">
              <label className={label}>Categoria</label>
              <select name="category_id" defaultValue={product?.category_id ?? ""} className={input}>
                <option value="">— sem categoria —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm text-linen-700">
              <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} />
              Ativo (visível na loja)
            </label>
            <label className="flex items-center gap-2 text-sm text-linen-700">
              <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} />
              Destaque na home
            </label>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-4 font-display text-lg text-ink">Imagens</h3>
            <GalleryField initial={product?.images ?? []} />
          </div>

          {error && (
            <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-linen-900 py-2.5 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-50 transition-colors hover:bg-champagne-700 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar produto"}
          </button>
        </div>
      </div>
    </form>
  );
}
