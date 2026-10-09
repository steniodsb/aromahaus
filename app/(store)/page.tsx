import { Fragment } from "react";
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
  getFragrances,
  getLatestReviews,
  getWishlistIds,
  withProductDetails,
} from "@/lib/queries";
import { mergeHomeSections, type HomeSectionKey } from "@/lib/store-defaults";
import { Hero, type HeroSlide } from "@/components/store/hero";
import { TrustStrip } from "@/components/store/trust-strip";
import { FragranceStrip } from "@/components/store/fragrance-strip";
import { CategoryCircles } from "@/components/store/category-circles";
import { ProductCarousel } from "@/components/store/product-carousel";
import { PromoMosaic, type PromoTile } from "@/components/store/promo-mosaic";
import { TypeBanners } from "@/components/store/type-banners";
import { PromoBanner } from "@/components/store/promo-banner";
import { GuideSection } from "@/components/store/guide-section";
import { Testimonials } from "@/components/store/testimonials";
import { ContactSection } from "@/components/store/contact-section";
import type { ProductWithDetails } from "@/lib/types";

/** Os cinco formatos, na ordem em que o cliente costuma decidir. */
const FORMAT_SLUGS = [
  "difusores",
  "home-sprays",
  "sabonetes-liquidos",
  "refis",
  "kits-presentes",
];

/**
 * Arte própria por categoria, em vez da foto do primeiro produto cadastrado.
 *
 * Sem isto, as cinco categorias apareciam com fundos quase idênticos — e o
 * cliente não distinguia uma fileira de cinco frascos brancos iguais.
 */
const CATEGORY_ART: Record<string, string> = {
  difusores: "/categorias/difusores.webp",
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
  },
  {
    image: "/home/banner-kits.webp",
    imageMobile: "/home/banner-kits-mobile.webp",
    bg: null,
    eyebrow: "Kits & presentes",
    title: "Um presente que",
    titleAccent: "fica na casa",
    subtitle:
      "Combinações prontas na caixa da casa, com embrulho e cartão escrito à mão — e a nota fiscal do lado de fora, sem preço à vista.",
    badge: "até 20% OFF",
    badgeNote: "nos kits",
    ctaLabel: "Ver kits",
    ctaHref: "/categoria/kits-presentes",
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
    badge: "a partir de R$ 109",
    badgeNote: "250 ml",
    ctaLabel: "Ver refis",
    ctaHref: "/categoria/refis",
  },
];

const PROMO_TILES: PromoTile[] = [
  {
    image: "/home/promo-kits.webp",
    eyebrow: "Para presentear",
    title: "Kit Lavabo",
    text: "Sabonete e home spray na mesma fragrância, em cerâmica com rosas em relevo. O presente de casa nova que mais sai daqui.",
    ctaLabel: "Montar meu kit",
    href: "/categoria/kits-presentes",
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
    fragrances,
    reviews,
    savedIds,
  ] = await Promise.all([
    getFeaturedProducts(10),
    getBanners(),
    getBestSellers(10),
    getNewArrivals(10),
    getPromotions(10),
    getCategoryCircles(FORMAT_SLUGS),
    getMiniBanners(),
    getPromoBanner(),
    getHomeSections(),
    getFragrances(),
    getLatestReviews(3),
    getWishlistIds(),
  ]);

  // Variantes e notas em uma passada só para as quatro vitrines juntas: sem
  // isto seriam oito consultas, e vários produtos apareceriam em mais de uma
  // seção buscando exatamente os mesmos dados.
  const all = [...featuredRaw, ...bestSellersRaw, ...newArrivalsRaw, ...promotionsRaw];
  const unique = [...new Map(all.map((p) => [p.id, p])).values()];
  const detailed = new Map((await withProductDetails(unique)).map((p) => [p.id, p]));
  const hydrate = (list: { id: string }[]) =>
    list
      .map((p) => detailed.get(p.id))
      .filter((p): p is ProductWithDetails => Boolean(p));

  // A arte de categoria tem precedência sobre a imagem do banco, mas só para
  // os cinco formatos conhecidos — categoria nova criada no painel continua
  // usando a imagem que o admin subir.
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

  // Seções de produtos governadas pelo admin (ordem, título, visibilidade).
  const productsByKey: Record<HomeSectionKey, ProductWithDetails[]> = {
    featured: hydrate(featuredRaw),
    bestsellers: hydrate(bestSellersRaw),
    promotions: hydrate(promotionsRaw),
    newarrivals: hydrate(newArrivalsRaw),
  };
  const sections = mergeHomeSections(savedSections).filter(
    (s) => s.enabled && productsByKey[s.key].length > 0,
  );

  return (
    <>
      <Hero slides={slides} />
      <TrustStrip />
      <CategoryCircles circles={formats} />

      {sections.map((sec, idx) => (
        <Fragment key={sec.key}>
          <div className="mx-auto max-w-7xl px-6">
            <ProductCarousel
              products={productsByKey[sec.key]}
              title={sec.title}
              savedIds={savedIds}
            />
          </div>
          {idx === 0 && <PromoMosaic tiles={PROMO_TILES} />}
          {idx === 1 && <FragranceStrip fragrances={fragrances} />}
          {idx === 2 && <PromoBanner promo={promo} />}
        </Fragment>
      ))}

      {sections.length === 0 && (
        <>
          <PromoMosaic tiles={PROMO_TILES} />
          <FragranceStrip fragrances={fragrances} />
          <PromoBanner promo={promo} />
        </>
      )}

      <GuideSection />
      <TypeBanners banners={mini} />
      <Testimonials reviews={reviews} />
      <ContactSection />
    </>
  );
}
