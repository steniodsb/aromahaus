import type { CategoryType } from "@/lib/types";

/**
 * O mapa de navegação da loja, num lugar só.
 *
 * Cabeçalho, menu do celular e rodapé liam listas parecidas e separadas, e foi
 * assim que o rodapé passou meses apontando para uma página que o menu já não
 * mostrava. Agora as três telas leem daqui.
 */

export interface NavItem {
  label: string;
  href: string;
  /** Texto de apoio no menu do celular e nos dropdowns. */
  note?: string;
  /** Destaca em dourado — usado em Promoções. */
  accent?: boolean;
}

/** Coleções comerciais. Vêm antes das categorias no menu, de propósito. */
export const COLECOES: NavItem[] = [
  { label: "Mais vendidos", href: "/mais-vendidos", note: "O que mais sai daqui" },
  { label: "Promoções", href: "/promocoes", note: "Com desconto agora", accent: true },
  { label: "Novidades", href: "/novidades", note: "Acabou de chegar" },
  { label: "Para presentear", href: "/presentes", note: "Embrulho e cartão à mão" },
];

/** Institucional e ajuda — o dropdown "Atendimento" e a coluna do rodapé. */
export const AJUDA: NavItem[] = [
  { label: "A Haus", href: "/sobre", note: "Quem faz e como" },
  { label: "Diário", href: "/blog", note: "Guias de uso e fragrância" },
  { label: "Perguntas frequentes", href: "/faq", note: "Duração, varetas, refil" },
  { label: "Rastrear pedido", href: "/rastreio", note: "Acompanhe a entrega" },
  { label: "Trocas e devoluções", href: "/trocas-e-devolucoes", note: "Prazos e como pedir" },
  { label: "Fale com a gente", href: "/contato", note: "WhatsApp e e-mail" },
];

/** Links legais, só no rodapé. */
export const LEGAL: NavItem[] = [
  { label: "Política de privacidade", href: "/politica-de-privacidade" },
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
];

/**
 * Ordem em que as famílias olfativas aparecem no mega menu.
 *
 * Fixa, e não alfabética: vai do mais leve ao mais encorpado, que é como se
 * descreve um perfume — e como o cliente costuma se localizar.
 */
export const ORDEM_FAMILIAS = [
  "Cítrico",
  "Fresco",
  "Verde",
  "Floral",
  "Herbal",
  "Amadeirado",
  "Âmbar",
  "Gourmand",
];

/** Uma cor por família, para o menu e os chips terem ritmo visual. */
export const COR_FAMILIA: Record<string, string> = {
  Cítrico: "bg-champagne-300",
  Fresco: "bg-linen-300",
  Verde: "bg-[#c3cbb6]",
  Floral: "bg-lilac-300",
  Herbal: "bg-[#b8c4b4]",
  Amadeirado: "bg-[#b49a7c]",
  Âmbar: "bg-champagne-500",
  Gourmand: "bg-[#cbab8a]",
};

export function corDaFamilia(familia: string | null | undefined) {
  return (familia && COR_FAMILIA[familia]) || "bg-linen-300";
}

/** Agrupa as fragrâncias por família, na ordem acima. */
export function agruparPorFamilia(
  fragrancias: { name: string; family: string | null }[],
) {
  const grupos = new Map<string, string[]>();
  for (const f of fragrancias) {
    const chave = f.family ?? "Outras";
    const atual = grupos.get(chave);
    if (atual) atual.push(f.name);
    else grupos.set(chave, [f.name]);
  }
  return [...grupos.entries()]
    .map(([family, names]) => ({ family, names }))
    .sort((a, b) => {
      const ia = ORDEM_FAMILIAS.indexOf(a.family);
      const ib = ORDEM_FAMILIAS.indexOf(b.family);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

/** Ícone de cada formato, resolvido por tipo de categoria. */
export const ICON_NAME_BY_TYPE: Record<CategoryType, string> = {
  difusor: "Flower2",
  home_spray: "SprayCan",
  sabonete: "Droplets",
  refil: "RefreshCw",
  kit: "Gift",
  acessorio: "Sparkles",
};
