/**
 * Formatos e valores padrão das seções editáveis da home (banners, promo,
 * seções e pixels). Sem imports de servidor — pode ser usado tanto nas
 * Server Components da loja quanto nos editores client do admin.
 *
 * Quando o admin não cadastrou nada, a loja cai nesses padrões da marca.
 */

// ── Mini banners ("Navegue por formato") ──────────────────────────────────
export interface MiniBanner {
  label: string;
  href: string;
  image: string;
}

export const DEFAULT_MINI_BANNERS: MiniBanner[] = [
  { label: "Para presentear", href: "/presentes", image: "/categorias/kits-presentes.webp" },
  { label: "Refis", href: "/categoria/refis", image: "/categorias/refis.webp" },
  { label: "Novidades", href: "/novidades", image: "/categorias/difusores.webp" },
];

// ── Banner promocional (faixa larga) ──────────────────────────────────────
export interface PromoBanner {
  enabled: boolean;
  image: string;
  eyebrow: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
}

export const DEFAULT_PROMO: PromoBanner = {
  enabled: true,
  image: "/home/promo.webp",
  eyebrow: "Feito à mão, em pequenos lotes",
  title: "Perfumaria por Galvão Amorim",
  ctaLabel: "Conheça a Haus",
  ctaHref: "/sobre",
};

// ── Seções/tags da home ───────────────────────────────────────────────────
export type HomeSectionKey = "featured" | "bestsellers" | "promotions" | "newarrivals";

export interface HomeSection {
  key: HomeSectionKey;
  title: string;
  enabled: boolean;
}

export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  { key: "featured", title: "Seleção da casa", enabled: true },
  { key: "bestsellers", title: "Os mais queridos", enabled: true },
  { key: "promotions", title: "Em oferta", enabled: true },
  { key: "newarrivals", title: "Chegou agora", enabled: true },
];

/** Mescla o que o admin salvou com os padrões, garantindo que toda seção
 *  conhecida exista (inclusive as adicionadas depois do último salvamento). */
export function mergeHomeSections(saved: HomeSection[] | null | undefined): HomeSection[] {
  if (!saved || saved.length === 0) return DEFAULT_HOME_SECTIONS;
  const known = new Set<string>(DEFAULT_HOME_SECTIONS.map((d) => d.key));
  const present = new Set<string>();
  const result: HomeSection[] = [];
  for (const s of saved) {
    if (!known.has(s.key) || present.has(s.key)) continue;
    const def = DEFAULT_HOME_SECTIONS.find((d) => d.key === s.key)!;
    result.push({ key: s.key, title: s.title?.trim() || def.title, enabled: !!s.enabled });
    present.add(s.key);
  }
  for (const d of DEFAULT_HOME_SECTIONS) if (!present.has(d.key)) result.push(d);
  return result;
}

// ── Pixels / tags de marketing ────────────────────────────────────────────
export interface Pixels {
  ga4_id: string;
  gtm_id: string;
  google_ads_id: string;
  meta_pixel_id: string;
  head_html: string;
}

export const EMPTY_PIXELS: Pixels = {
  ga4_id: "",
  gtm_id: "",
  google_ads_id: "",
  meta_pixel_id: "",
  head_html: "",
};
