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
  image: "/home/promo-kits.webp",
  eyebrow: "Para presentear",
  title: "Pronto para presentear, com embrulho e cartão",
  ctaLabel: "Ver presentes",
  ctaHref: "/presentes",
};

// ── Seções/tags da home ───────────────────────────────────────────────────
export type HomeSectionKey = "featured" | "bestsellers" | "promotions" | "newarrivals";

export interface HomeSection {
  key: HomeSectionKey;
  title: string;
  enabled: boolean;
}

export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  { key: "bestsellers", title: "Mais vendidos", enabled: true },
  { key: "promotions", title: "Promoções", enabled: true },
  { key: "newarrivals", title: "Lançamentos", enabled: true },
  // Desligada por padrão: a home já abre com três vitrines, e uma quarta
  // empurra depoimentos e contato para longe demais do topo. Quem quiser
  // destacar uma curadoria liga aqui.
  { key: "featured", title: "Seleção da casa", enabled: false },
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

/**
 * Formato de cada id de pixel.
 *
 * Mora aqui, e não no componente, porque dois lugares precisam da MESMA
 * regra: o formulário do admin (para avisar o lojista que o id está errado)
 * e o `SiteScripts` (que recusa o campo antes de interpolá-lo dentro de uma
 * string JavaScript na página).
 */
export const PIXEL_FORMATOS: Record<
  "ga4_id" | "gtm_id" | "google_ads_id" | "meta_pixel_id",
  { regex: RegExp; exemplo: string }
> = {
  ga4_id: { regex: /^G-[A-Z0-9]{6,14}$/i, exemplo: "G-XXXXXXXXXX" },
  gtm_id: { regex: /^GTM-[A-Z0-9]{4,12}$/i, exemplo: "GTM-XXXXXXX" },
  google_ads_id: { regex: /^AW-\d{6,14}$/i, exemplo: "AW-123456789" },
  meta_pixel_id: { regex: /^\d{8,20}$/, exemplo: "123456789012345" },
};

/** Nome amigável de cada campo, para a mensagem de erro do formulário. */
export const PIXEL_ROTULOS: Record<keyof typeof PIXEL_FORMATOS, string> = {
  ga4_id: "Google Analytics 4",
  gtm_id: "Google Tag Manager",
  google_ads_id: "Google Ads",
  meta_pixel_id: "Meta Pixel",
};
