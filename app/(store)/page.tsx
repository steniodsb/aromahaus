import {
  getFeaturedProducts,
  getBanners,
  getBestSellers,
  getNewArrivals,
  getPromotions,
  getCategoryCircles,
  getMiniBanners,
  getPromoBanner,
  getHomeSections,
  getLatestReviews,
  getWishlistIds,
  withProductDetails,
} from "@/lib/queries";
import { mergeHomeSections, type HomeSectionKey } from "@/lib/store-defaults";
import { Hero, type HeroSlide } from "@/components/store/hero";
import { TrustStrip } from "@/components/store/trust-strip";
import { CategoryCircles } from "@/components/store/category-circles";
import { ProductCarousel } from "@/components/store/product-carousel";
import { PromoMosaic, type PromoTile } from "@/components/store/promo-mosaic";
import { TypeBanners } from "@/components/store/type-banners";
import { PromoBanner } from "@/components/store/promo-banner";
import { Testimonials } from "@/components/store/testimonials";
import { ContactSection } from "@/components/store/contact-section";
import type { ProductWithDetails } from "@/lib/types";

/** Os cinco formatos, na ordem em que o cliente costuma decidir. */
const FORMAT_SLUGS = [
  "difusores",
  "difusores-porcelana",
  "home-sprays",
  "sabonetes-liquidos",
  "refis",
];

/**
 * Arte própria por categoria, em vez da foto do primeiro produto cadastrado.
 *
 * Sem isto, as cinco categorias apareciam com fundos quase idênticos — e o
 * cliente não distinguia uma fileira de cinco frascos brancos iguais.
 */
const CATEGORY_ART: Record<string, string> = {
  difusores: "/categorias/difusores.webp",
  "difusores-porcelana": "/categorias/difusores-porcelana.webp",
  "home-sprays": "/categorias/home-sprays.webp",
  "sabonetes-liquidos": "/categorias/sabonetes-liquidos.webp",
  refis: "/categorias/refis.webp",
  "kits-presentes": "/categorias/kits-presentes.webp",
};

/**
 * Banners padrão, usados enquanto o painel não tiver os seus.
 *
 * Ficam no código (e não no banco) para a loja nunca nascer com um buraco no
 * topo. Admin → Banners sobrescreve a qualquer momento.
 */
const DEFAULT_SLIDES: HeroSlide[] = [
  {
    image: "/home/banner-casa.webp",
    imageMobile: "/home/banner-casa-mobile.webp",
    bg: null,
    eyebrow: "Perfumaria de ambiente",
    title: "A casa também tem",
    titleAccent: "um jeito de cheirar",
    subtitle:
      "Difusores de varetas, home sprays e sabonetes em fragrâncias autorais, feitos em pequenos lotes. Escolha o cheiro; do resto a gente cuida.",
    badge: null,
    ctaLabel: "Ver fragrâncias",
    ctaHref: "/produtos",
    detail: "/home/detalhe-fita.webp",
    cardEyebrow: "Linha Blanc",
    cardTitle: "Difusor de varetas em cerâmica",
    keywords: ["Fragrâncias autorais", "Pequenos lotes", "Feito à mão"],
  },
  {
    image: "/home/banner-porcelana.webp",
    imageMobile: "/home/banner-porcelana-mobile.webp",
    bg: null,
    eyebrow: "Difusor de porcelana",
    title: "Uma flor que",
    titleAccent: "perfuma a casa",
    subtitle:
      "No lugar das varetas, pétalas de porcelana: a essência sobe por elas e se espalha devagar, sem chama e sem tomada. Frasco de 500 ml, laço de cetim e detalhe dourado.",
    badge: "R$ 580",
    badgeNote: "500 ml",
    ctaLabel: "Conhecer o difusor",
    ctaHref: "/categoria/difusores-porcelana",
    detail: "/home/detalhe-tag.webp",
    cardEyebrow: "Blend Floral",
    cardTitle: "Difusor de porcelana 500 ml",
    keywords: ["Flor de porcelana", "Sem chama", "Peça de decoração"],
  },
  {
    image: "/home/banner-refis.webp",
    imageMobile: "/home/banner-refis-mobile.webp",
    bg: null,
    eyebrow: "Refis",
    title: "O mesmo perfume,",
    titleAccent: "no frasco que já é seu",
    subtitle:
      "Recarregue o difusor em vez de comprar outro: mesma essência, menos vidro e menos preço. Vem com um jogo novo de varetas.",
    badge: "R$ 150",
    badgeNote: "250 ml",
    ctaLabel: "Ver refis",
    ctaHref: "/categoria/refis",
    detail: "/home/detalhe-difusor.webp",
    cardEyebrow: "Blend Floral",
    cardTitle: "Refil para o seu difusor",
    keywords: ["Mesma essência", "Menos vidro", "Varetas novas"],
  },
];

/** Os dois banners de promoção, entre as vitrines de produto. */
const PROMO_TILES: PromoTile[] = [
  {
    image: "/home/promo-kits.webp",
    eyebrow: "Para presentear",
    title: "Para o lavabo",
    text: "Sabonete líquido e home spray em cerâmica com rosas em relevo. Com embrulho e cartão escrito à mão, é o presente de casa nova que mais sai daqui.",
    ctaLabel: "Ver presentes",
    href: "/presentes",
    align: "left",
  },
  {
    image: "/home/promo-refis.webp",
    eyebrow: "Economize",
    title: "Refil custa 42% menos",
    text: "Um difusor novo a cada estação sai caro — e enche o armário de vidro. O refil resolve os dois.",
    ctaLabel: "Ver refis",
    href: "/categoria/refis",
    align: "right",
  },
];

export default async function Home() {
  const [
    featuredRaw,
    banners,
    bestSellersRaw,
    newArrivalsRaw,
    promotionsRaw,
    formatsRaw,
    mini,
    promo,
    savedSections,
    reviews,
    savedIds,
  ] = await Promise.all([
    getFeaturedProducts(12),
    getBanners(),
    getBestSellers(12),
    getNewArrivals(12),
    getPromotions(12),
    getCategoryCircles(FORMAT_SLUGS),
    getMiniBanners(),
    getPromoBanner(),
    getHomeSections(),
    getLatestReviews(3),
    getWishlistIds(),
  ]);

  // Variantes e notas em uma passada só para as vitrines juntas: sem isto
  // seriam oito consultas, e vários produtos apareceriam em mais de uma seção
  // buscando exatamente os mesmos dados.
  const all = [...bestSellersRaw, ...promotionsRaw, ...newArrivalsRaw, ...featuredRaw];
  const unique = [...new Map(all.map((p) => [p.id, p])).values()];
  const detailed = new Map((await withProductDetails(unique)).map((p) => [p.id, p]));
  const hydrate = (list: { id: string }[]) =>
    list
      .map((p) => detailed.get(p.id))
      .filter((p): p is ProductWithDetails => Boolean(p));

  const formats = formatsRaw.map((c) => ({
    ...c,
    image: CATEGORY_ART[c.slug] ?? c.image,
  }));

  const slides: HeroSlide[] = banners.length
    ? banners.map((b) => ({
        image: b.image || null,
        bg: b.bg || null,
        eyebrow: b.eyebrow,
        title: b.title,
        subtitle: b.subtitle,
        ctaLabel: b.ctaLabel,
        ctaHref: b.ctaHref,
      }))
    : DEFAULT_SLIDES;

  // A ORDEM da home é fixa; o painel controla o título de cada vitrine e se
  // ela aparece. Antes a ordem também saía do painel, e as peças promocionais
  // caíam em lugares diferentes conforme o que estivesse ligado — os banners
  // precisam de endereço certo para a página ter ritmo.
  const produtos: Record<HomeSectionKey, ProductWithDetails[]> = {
    bestsellers: hydrate(bestSellersRaw),
    promotions: hydrate(promotionsRaw),
    newarrivals: hydrate(newArrivalsRaw),
    featured: hydrate(featuredRaw),
  };
  const config = new Map(mergeHomeSections(savedSections).map((s) => [s.key, s]));

  const vitrine = (chave: HomeSectionKey) => {
    const cfg = config.get(chave);
    const lista = produtos[chave];
    if (!cfg?.enabled || lista.length === 0) return null;
    return (
      <div className="mx-auto max-w-7xl px-6">
        <ProductCarousel products={lista} title={cfg.title} savedIds={savedIds} />
      </div>
    );
  };

  return (
    <>
      {/* 1. Banners */}
      <Hero slides={slides} />

      {/* 2. Frete grátis, cupom, parcelamento */}
      <TrustStrip />

      {/* 3. Categorias */}
      <CategoryCircles circles={formats} />

      {/* Atalhos extras — só quando o painel cadastrou mini banners. */}
      {mini?.length ? <TypeBanners banners={mini} /> : null}

      {/* 4. Catálogo: mais vendidos e promoções */}
      {vitrine("bestsellers")}
      {vitrine("promotions")}

      {/* 5. Banners de promoção */}
      <PromoMosaic tiles={PROMO_TILES} />

      {/* 6. Lançamentos */}
      {vitrine("newarrivals")}
      {vitrine("featured")}

      {/* 7. Banner de kits */}
      <PromoBanner promo={promo} />

      {/* 8. Depoimentos */}
      <Testimonials reviews={reviews} />

      {/* 9. Contato */}
      <ContactSection />
    </>
  );
}
