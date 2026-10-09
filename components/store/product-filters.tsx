"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { cn } from "@/lib/utils";
import type { Category, ProductWithDetails } from "@/lib/types";

type SortKey = "relevance" | "price-asc" | "price-desc" | "name" | "rating";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Relevância" },
  { key: "price-asc", label: "Menor preço" },
  { key: "price-desc", label: "Maior preço" },
  { key: "rating", label: "Melhor avaliados" },
  { key: "name", label: "Nome (A–Z)" },
];

const ROOM_LABEL: Record<string, string> = {
  sala: "Sala",
  quarto: "Quarto",
  banheiro: "Banheiro",
  lavabo: "Lavabo",
  escritorio: "Escritório",
  closet: "Closet",
  cozinha: "Cozinha",
  entrada: "Entrada",
};

const INTENSITY_LABEL: Record<number, string> = {
  1: "Muito discreta",
  2: "Discreta",
  3: "Equilibrada",
  4: "Marcante",
  5: "Muito marcante",
};

/** Menor preço vendável — é por ele que a loja ordena e filtra faixa. */
function priceOf(p: ProductWithDetails) {
  const prices = p.variants.length
    ? p.variants.map((v) => Number(v.price))
    : [Number(p.price)];
  return Math.min(...prices);
}

function hasStock(p: ProductWithDetails) {
  return p.variants.length ? p.variants.some((v) => v.stock > 0) : p.stock > 0;
}

type Facet = { value: string; count: number };

/** Conta quantos produtos caem em cada valor de uma faceta. */
function facet<T>(
  products: ProductWithDetails[],
  pick: (p: ProductWithDetails) => T[] | T | null,
): Facet[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const got = pick(p);
    const list = (Array.isArray(got) ? got : [got]).filter(
      (v) => v != null && v !== "",
    );
    for (const v of list) {
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

const CHECK_ROW =
  "flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-linen-700 transition-colors hover:text-ink";

/**
 * Um grupo de caixas de seleção.
 *
 * Fica FORA do componente de propósito: definido dentro, ele seria um tipo
 * novo a cada render, o React remontaria os inputs e o checkbox perderia o
 * foco a cada clique.
 */
function Group({
  title,
  items,
  selected,
  onToggle,
  label,
}: {
  title: string;
  items: Facet[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  label?: (v: string) => string;
}) {
  // Faceta com um valor só não filtra nada — todo produto da lista tem ele.
  if (items.length < 2) return null;
  return (
    <div className="border-t border-line pt-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      {items.map((it) => (
        <label key={it.value} className={CHECK_ROW}>
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-champagne-600"
            checked={selected.has(it.value)}
            onChange={() => onToggle(it.value)}
          />
          <span className="flex-1">{label ? label(it.value) : it.value}</span>
          <span className="text-xs text-linen-500">{it.count}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * Filtros da vitrine, usados tanto em /produtos quanto nas categorias.
 *
 * As facetas são as de uma perfumaria — fragrância, família olfativa,
 * ambiente e intensidade — e não as de um catálogo genérico. É o que
 * diferencia procurar "um cheiro amadeirado para o escritório" de procurar
 * "um produto entre R$ 100 e R$ 200".
 *
 * Tudo acontece no cliente, sobre a lista que o servidor já mandou: o catálogo
 * é de dezenas de itens, não de milhares, e filtrar sem ida ao servidor é
 * instantâneo.
 */
export function ProductFilters({
  products,
  categories = [],
  showFormat = true,
  initialFragrance,
  initialFamily,
}: {
  products: ProductWithDetails[];
  categories?: Category[];
  /** Falso dentro de uma categoria — ali o formato já está decidido. */
  showFormat?: boolean;
  initialFragrance?: string;
  initialFamily?: string;
}) {
  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // ── Facetas ──────────────────────────────────────────────────────────────
  const formats = useMemo(
    () =>
      facet(products, (p) =>
        p.category_id ? catById.get(p.category_id)?.name ?? null : null,
      ).sort((a, b) => b.count - a.count),
    [products, catById],
  );
  const fragrances = useMemo(
    () =>
      facet(products, (p) => p.fragrance).sort((a, b) =>
        a.value.localeCompare(b.value, "pt-BR"),
      ),
    [products],
  );
  const families = useMemo(
    () => facet(products, (p) => p.olfactory_family).sort((a, b) => b.count - a.count),
    [products],
  );
  const rooms = useMemo(
    () => facet(products, (p) => p.rooms).sort((a, b) => b.count - a.count),
    [products],
  );
  const intensities = useMemo(
    () =>
      facet(products, (p) => p.intensity).sort(
        (a, b) => Number(a.value) - Number(b.value),
      ),
    [products],
  );

  const onSaleCount = products.filter(
    (p) => p.compare_at_price && p.compare_at_price > priceOf(p),
  ).length;

  // ── Estado ───────────────────────────────────────────────────────────────
  const [format, setFormat] = useState<Set<string>>(new Set());
  const [fragrance, setFragrance] = useState<Set<string>>(
    new Set(initialFragrance ? [initialFragrance] : []),
  );
  const [family, setFamily] = useState<Set<string>>(
    new Set(initialFamily ? [initialFamily] : []),
  );
  const [room, setRoom] = useState<Set<string>>(new Set());
  const [intensity, setIntensity] = useState<Set<string>>(new Set());
  const [onSale, setOnSale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [openMobile, setOpenMobile] = useState(false);

  const toggle = (
    set: Set<string>,
    fn: (s: Set<string>) => void,
    value: string,
  ) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    fn(next);
  };

  const activeCount =
    format.size +
    fragrance.size +
    family.size +
    room.size +
    intensity.size +
    (onSale ? 1 : 0) +
    (inStock ? 1 : 0);

  function clearAll() {
    setFormat(new Set());
    setFragrance(new Set());
    setFamily(new Set());
    setRoom(new Set());
    setIntensity(new Set());
    setOnSale(false);
    setInStock(false);
  }

  // ── Aplica ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (format.size) {
        const name = p.category_id ? catById.get(p.category_id)?.name : null;
        if (!name || !format.has(name)) return false;
      }
      if (fragrance.size && (!p.fragrance || !fragrance.has(p.fragrance))) return false;
      if (family.size && (!p.olfactory_family || !family.has(p.olfactory_family)))
        return false;
      if (room.size && !p.rooms?.some((r) => room.has(r))) return false;
      if (intensity.size && (!p.intensity || !intensity.has(String(p.intensity))))
        return false;
      if (onSale && !(p.compare_at_price && p.compare_at_price > priceOf(p)))
        return false;
      if (inStock && !hasStock(p)) return false;
      return true;
    });

    const out = [...list];
    if (sort === "price-asc") out.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort === "price-desc") out.sort((a, b) => priceOf(b) - priceOf(a));
    else if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    else if (sort === "rating")
      out.sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
    return out;
  }, [
    products,
    catById,
    format,
    fragrance,
    family,
    room,
    intensity,
    onSale,
    inStock,
    sort,
  ]);

  // ── UI ───────────────────────────────────────────────────────────────────

  const sidebar = (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-ink">Filtrar</h2>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-[0.625rem] uppercase tracking-[0.14em] text-champagne-700 hover:text-champagne-600"
          >
            Limpar ({activeCount})
          </button>
        )}
      </div>

      {showFormat && (
        <Group
          title="Formato"
          items={formats}
          selected={format}
          onToggle={(v) => toggle(format, setFormat, v)}
        />
      )}
      <Group
        title="Fragrância"
        items={fragrances}
        selected={fragrance}
        onToggle={(v) => toggle(fragrance, setFragrance, v)}
      />
      <Group
        title="Família olfativa"
        items={families}
        selected={family}
        onToggle={(v) => toggle(family, setFamily, v)}
      />
      <Group
        title="Ambiente"
        items={rooms}
        selected={room}
        onToggle={(v) => toggle(room, setRoom, v)}
        label={(v) => ROOM_LABEL[v] ?? v}
      />
      <Group
        title="Intensidade"
        items={intensities}
        selected={intensity}
        onToggle={(v) => toggle(intensity, setIntensity, v)}
        label={(v) => INTENSITY_LABEL[Number(v)] ?? v}
      />

      <div className="border-t border-line pt-5">
        <h3 className="eyebrow mb-3">Disponibilidade</h3>
        <label className={CHECK_ROW}>
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-champagne-600"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          <span className="flex-1">Pronta entrega</span>
        </label>
        {onSaleCount > 0 && (
          <label className={CHECK_ROW}>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-champagne-600"
              checked={onSale}
              onChange={(e) => setOnSale(e.target.checked)}
            />
            <span className="flex-1">Em oferta</span>
            <span className="text-xs text-linen-500">{onSaleCount}</span>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-14">
      <aside className="hidden lg:block">{sidebar}</aside>

      <div className="mb-5 lg:hidden">
        <button
          onClick={() => setOpenMobile(true)}
          className="inline-flex items-center gap-2 border border-line px-5 py-2.5 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
          Filtrar{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {openMobile && (
        <div
          className="fixed inset-0 z-50 bg-linen-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpenMobile(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[88%] overflow-y-auto bg-linen-50 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Fechar filtros"
              onClick={() => setOpenMobile(false)}
              className="mb-4 ml-auto flex p-1 text-linen-600 hover:text-ink"
            >
              <X className="h-5 w-5" strokeWidth={1.4} />
            </button>
            {sidebar}
            <button
              onClick={() => setOpenMobile(false)}
              className="mt-7 w-full border border-linen-900 bg-linen-900 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50"
            >
              Ver {filtered.length} {filtered.length === 1 ? "item" : "itens"}
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-8 flex items-center justify-between gap-3 border-b border-line pb-4">
          <p className="text-xs text-linen-600">
            {filtered.length} {filtered.length === 1 ? "item" : "itens"}
          </p>
          <label className="flex items-center gap-2 text-xs text-linen-600">
            <span className="hidden sm:inline">Ordenar por</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="border-0 border-b border-line bg-transparent py-1 text-xs text-ink outline-none focus:border-champagne-600"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-linen-300 p-12 text-center">
            <p className="text-sm text-linen-700">Nada com esses filtros.</p>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className={cn(
                  "mt-4 border-b border-champagne-500 pb-1 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700 hover:text-ink",
                )}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
