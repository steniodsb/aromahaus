import Link from "next/link";
import Image from "next/image";
import {
  User,
  Heart,
  ChevronDown,
  Headphones,
  Flower2,
  SprayCan,
  Droplets,
  RefreshCw,
  Gift,
  Sparkles,
} from "lucide-react";
import { CartBadge } from "@/components/site/cart-badge";
import { SearchBox } from "@/components/site/search-box";
import { MobileMenu } from "@/components/site/mobile-menu";
import { BrandLink } from "@/components/site/brand";
import {
  COLECOES,
  AJUDA,
  agruparPorFamilia,
  corDaFamilia,
} from "@/components/site/nav-data";
import { getTopCategories, getFragrances } from "@/lib/queries";
import type { CategoryType } from "@/lib/types";

/** Um ícone por formato — o dropdown de produtos lê muito mais rápido com eles. */
const ICON_BY_TYPE: Record<CategoryType, typeof Flower2> = {
  difusor: Flower2,
  home_spray: SprayCan,
  sabonete: Droplets,
  refil: RefreshCw,
  kit: Gift,
  acessorio: Sparkles,
};

/** Uma linha de apoio por formato, no dropdown "Produtos". */
const NOTE_BY_TYPE: Partial<Record<CategoryType, string>> = {
  difusor: "Perfume contínuo, sem chama",
  home_spray: "Para o antes das visitas",
  sabonete: "Para o lavabo e as mãos",
  refil: "Recarregue o seu difusor",
  kit: "Prontos para presentear",
  acessorio: "Varetas e complementos",
};

export async function Header() {
  const [categories, fragrances] = await Promise.all([
    getTopCategories(),
    getFragrances(),
  ]);

  const familias = agruparPorFamilia(fragrances);

  // Dez itens numa linha só não cabem em notebook de 1280. Em vez de cortar
  // nas pontas (que é o que acontecia), a barra aperta o espaçamento e, se
  // ainda assim não couber, quebra para uma segunda linha.
  const navLink =
    "group/item flex items-center gap-1.5 whitespace-nowrap text-[0.6875rem] uppercase tracking-[0.08em] text-linen-800 transition-colors hover:text-champagne-600 xl:gap-2 xl:tracking-[0.1em]";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-linen-100 text-ink shadow-[0_10px_30px_-24px_rgba(51,35,29,0.55)]">
      {/* ===================== DESKTOP (lg+) ===================== */}
      <div className="hidden lg:block">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-10 px-6 py-5">
          <div className="flex items-center gap-5 justify-self-start">
            {/* Atendimento: o institucional sai da barra de categorias para a
                barra de categorias ficar só com o que vende. */}
            <div className="group relative">
              <button className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700 transition-colors hover:text-champagne-600">
                <Headphones className="h-4 w-4" strokeWidth={1.4} />
                Atendimento
                <ChevronDown className="h-3 w-3" strokeWidth={1.6} />
              </button>
              <div className="invisible absolute left-0 top-full z-50 w-64 pt-3.5 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="border border-line bg-linen-50 py-2 shadow-[0_20px_50px_-20px_rgba(43,39,34,0.55)]">
                  {AJUDA.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-5 py-2.5 transition-colors hover:bg-linen-100"
                    >
                      <span className="block text-sm text-ink">{item.label}</span>
                      {item.note ? (
                        <span className="mt-0.5 block text-xs text-linen-600">
                          {item.note}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <SearchBox className="w-56" />
          </div>

          <BrandLink className="justify-self-center" lockupClassName="h-12" />

          <div className="flex items-center justify-end gap-6">
            <Link
              href="/conta/favoritos"
              aria-label="Lista de desejos"
              className="text-linen-800 transition-colors hover:text-champagne-600"
            >
              <Heart className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.4} />
            </Link>
            <Link
              href="/conta"
              className="flex items-center gap-2 text-linen-800 transition-colors hover:text-champagne-600"
            >
              <User className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.4} />
              <span className="text-[0.6875rem] uppercase tracking-[0.14em]">
                Minha conta
              </span>
            </Link>
            <CartBadge />
          </div>
        </div>

        <nav className="border-t border-line">
          {/* Seis itens numa linha: os formatos moram no dropdown "Produtos",
              em vez de ocupar a barra inteira com cinco links. */}
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2.5 px-6 py-3.5 xl:gap-x-10">
            {/* ── Produtos: os formatos ─────────────────────────────────── */}
            {categories.length > 0 && (
              <div className="group relative">
                <button className={navLink}>
                  Produtos
                  <ChevronDown className="h-3 w-3" strokeWidth={1.6} />
                </button>
                <div className="invisible absolute left-1/2 top-full z-50 w-[19rem] -translate-x-1/2 pt-3.5 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                  <div className="border border-line bg-linen-50 py-2 shadow-[0_20px_50px_-20px_rgba(51,35,29,0.55)]">
                    {categories.map((cat) => {
                      const Icon = ICON_BY_TYPE[cat.type] ?? Sparkles;
                      return (
                        <Link
                          key={cat.id}
                          href={`/categoria/${cat.slug}`}
                          className="group/cat flex items-center gap-3.5 px-5 py-2.5 transition-colors hover:bg-linen-100"
                        >
                          <Icon
                            className="h-[1.15rem] w-[1.15rem] shrink-0 text-champagne-600 transition-colors group-hover/cat:text-champagne-700"
                            strokeWidth={1.3}
                          />
                          <span>
                            <span className="block text-sm text-ink">{cat.name}</span>
                            {NOTE_BY_TYPE[cat.type] ? (
                              <span className="mt-0.5 block text-xs text-linen-600">
                                {NOTE_BY_TYPE[cat.type]}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      );
                    })}
                    <div className="mx-5 mt-2 border-t border-line pt-2.5">
                      <Link
                        href="/produtos"
                        className="block py-1 text-[0.625rem] uppercase tracking-[0.18em] text-champagne-700 hover:text-champagne-600"
                      >
                        Ver todos os produtos
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Mega menu de fragrâncias ────────────────────────────────
                Largura cheia e agrupado por família: a fragrância é o que o
                cliente procura, e uma lista corrida de oito nomes não diz a
                ninguém qual é fresco e qual é amadeirado. */}
            {fragrances.length > 0 && (
              <div className="group static">
                <button className={navLink}>
                  Fragrâncias
                  <ChevronDown className="h-3 w-3" strokeWidth={1.6} />
                </button>
                <div className="invisible absolute left-0 right-0 top-full z-50 pt-0 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                  <div className="border-t border-line bg-linen-50 shadow-[0_24px_50px_-20px_rgba(43,39,34,0.5)]">
                    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-9 lg:grid-cols-[1fr_17rem]">
                      <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
                        {familias.map((g) => (
                          <div key={g.family}>
                            <p className="mb-3 flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.16em] text-linen-600">
                              <span
                                className={`h-2 w-2 rounded-full ${corDaFamilia(g.family)}`}
                              />
                              {g.family}
                            </p>
                            <ul className="space-y-1.5">
                              {g.names.map((name) => (
                                <li key={name}>
                                  <Link
                                    href={`/produtos?fragrancia=${encodeURIComponent(name)}`}
                                    className="font-display text-lg leading-snug text-ink transition-colors hover:text-champagne-700"
                                  >
                                    {name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      <Link
                        href="/presentes"
                        className="group/card relative hidden overflow-hidden rounded-sm bg-linen-200 lg:block"
                      >
                        <Image
                          src="/home/promo-kits.webp"
                          alt=""
                          fill
                          sizes="17rem"
                          className="object-cover transition-transform duration-700 group-hover/card:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-linen-900/85 to-transparent" />
                        <div className="relative flex h-full flex-col justify-end p-5">
                          <p className="text-[0.625rem] uppercase tracking-[0.18em] text-champagne-300">
                            Para presentear
                          </p>
                          <p className="font-display mt-1.5 text-xl leading-tight text-linen-50">
                            Kits prontos, com embrulho e cartão
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="border-t border-line">
                      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
                        <span className="text-xs text-linen-600">
                          {fragrances.length} fragrâncias autorais, feitas em
                          pequenos lotes
                        </span>
                        <Link
                          href="/produtos"
                          className="text-[0.625rem] uppercase tracking-[0.18em] text-champagne-700 hover:text-champagne-600"
                        >
                          Ver o catálogo inteiro
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {COLECOES.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={
                  c.accent
                    ? "whitespace-nowrap text-[0.6875rem] uppercase tracking-[0.08em] text-champagne-700 transition-colors hover:text-champagne-600 xl:tracking-[0.1em]"
                    : navLink
                }
              >
                {c.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* ===================== MOBILE (< lg) ===================== */}
      <div className="lg:hidden">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
          <MobileMenu categories={categories} fragrances={fragrances} />
          <BrandLink className="justify-self-center" showSignature={false} lockupClassName="h-8" />
          <CartBadge />
        </div>
        <div className="px-4 pb-3.5">
          <SearchBox className="w-full" />
        </div>
      </div>
    </header>
  );
}
