"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  /** Arte de largura total: marfim à esquerda, cena entrando pela direita. */
  image: string | null;
  /** Recorte no produto para o celular. Sem ele, usa a arte do desktop. */
  imageMobile?: string | null;
  /** Cor de fundo enquanto a arte carrega (ou sem arte). */
  bg?: string | null;
  eyebrow: string;
  title: string;
  /** Segunda linha do título, em cacau — o respiro da composição. */
  titleAccent?: string;
  subtitle: string;
  /** Destaque ao lado do botão: "até 20% OFF", "a partir de R$ 109"… */
  badge?: string | null;
  badgeNote?: string | null;
  ctaLabel: string;
  ctaHref: string;
  /** Foto de detalhe em octógono, no canto (fita, tag, refil). Opcional. */
  detail?: string | null;
  /** Ficha do produto em destaque. Opcional. */
  cardEyebrow?: string | null;
  cardTitle?: string | null;
  /** Linha de palavras sob um fio, como na apresentação da marca. Opcional. */
  keywords?: string[];
}

const INTERVALO = 7000;

/**
 * Banner principal da loja, de largura total.
 *
 * A arte ocupa a tela de ponta a ponta, mas com a luz da marca: a área do
 * texto é marfim e a cena entra pela direita num degradê longo — nada de
 * foto escura com véu por cima, que brigava com o resto da loja, que é clara.
 * Sobre a arte, os elementos da identidade, cada um num canto:
 *   · o selo com "Perfumaria por Galvão Amorim" girando em volta do "ah";
 *   · a foto de detalhe na moldura em octógono do monograma, com a ficha
 *     do produto ao lado;
 *   · a linha sinuosa do manual ("o caminho do aroma no ar"), que corre por
 *     baixo e sobe pela direita até o selo, sem cruzar o texto.
 *
 * Os extras são opcionais: um banner do painel só com arte e texto funciona
 * igual, sem detalhe e sem ficha. Toda a tipografia vive no HTML, para o
 * painel trocar a chamada sem refazer a arte.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = slides.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (total < 2 || pausado) return;
    timer.current = setInterval(() => setI((p) => (p + 1) % total), INTERVALO);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [total, pausado]);

  if (!total) return null;
  const atual = Math.min(i, total - 1);
  const vai = (d: number) => setI((p) => (p + d + total) % total);

  return (
    <section
      className="relative isolate overflow-hidden border-b border-line bg-linen-100"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
    >
      {/* Todos os slides na mesma célula da grade: a seção assume a altura
          do maior e a troca é só de opacidade, sem pulo de layout. */}
      <div className="grid">
        {slides.map((s, idx) => (
          <Slide key={`${s.title}-${idx}`} s={s} idx={idx} ativo={idx === atual} />
        ))}
      </div>

      {total > 1 && (
        <div className="relative z-20 mx-auto flex max-w-7xl items-center gap-5 px-6 pb-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:pb-10">
          <div className="flex gap-2.5">
            {slides.map((s, idx) => (
              <button
                key={`${s.title}-dot-${idx}`}
                onClick={() => setI(idx)}
                aria-label={`Ver ${s.title}`}
                aria-current={idx === atual}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === atual
                    ? "w-8 bg-champagne-600"
                    : "w-1.5 bg-linen-300 hover:bg-linen-400",
                )}
              />
            ))}
          </div>

          <div className="ml-auto flex gap-2 lg:ml-0">
            <button
              onClick={() => vai(-1)}
              aria-label="Banner anterior"
              className="rounded-full border border-linen-300 bg-linen-100/70 p-2.5 text-linen-700 transition-colors hover:border-champagne-600 hover:text-champagne-600"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
            </button>
            <button
              onClick={() => vai(1)}
              aria-label="Próximo banner"
              className="rounded-full border border-linen-300 bg-linen-100/70 p-2.5 text-linen-700 transition-colors hover:border-champagne-600 hover:text-champagne-600"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.4} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Slide({ s, idx, ativo }: { s: HeroSlide; idx: number; ativo: boolean }) {
  const entra = ativo ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0";

  return (
    <div
      aria-hidden={!ativo}
      className={cn(
        "relative [grid-area:1/1] transition-opacity duration-700 lg:min-h-[40rem]",
        ativo ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {/* ── Arte ─────────────────────────────────────────────────────
          Desktop: de ponta a ponta, atrás do texto. Celular: um bloco em
          cima, que se desfaz no marfim antes do texto. */}
      <div
        className="relative aspect-[6/5] overflow-hidden sm:aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto"
        style={s.bg ? { background: s.bg } : undefined}
      >
        {s.image ? (
          <>
            <Image
              src={s.image}
              alt=""
              fill
              priority={idx === 0}
              sizes="100vw"
              className={cn(
                "object-cover object-right transition-transform duration-[7000ms] ease-out",
                s.imageMobile ? "hidden lg:block" : "",
                ativo ? "scale-[1.03]" : "scale-100",
              )}
            />
            {s.imageMobile ? (
              <Image
                src={s.imageMobile}
                alt=""
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover lg:hidden"
              />
            ) : null}
          </>
        ) : null}

        {/* Celular: a foto se desfaz no marfim, onde o texto começa */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-linen-100 to-transparent lg:hidden" />

        {ativo ? <AromaLine /> : null}

        <Seal className="absolute right-4 top-4 h-[5.25rem] w-[5.25rem] sm:right-6 sm:top-6 sm:h-28 sm:w-28 lg:right-10 lg:top-10" />

        {/* Celular: detalhe no canto da foto */}
        {s.detail ? (
          <Detail
            src={s.detail}
            className={cn("absolute bottom-4 left-4 w-24 sm:w-32 lg:hidden", entra)}
          />
        ) : null}
      </div>

      {/* Desktop: ficha em cima do detalhe, empilhados no canto inferior
          direito — à direita do produto, sem cobri-lo. */}
      {s.detail || s.cardTitle ? (
        <div
          className={cn(
            "absolute bottom-10 right-10 z-10 hidden flex-col items-end gap-3 transition-all delay-150 duration-700 lg:flex",
            entra,
          )}
        >
          {s.cardTitle ? (
            <div className="max-w-[14rem] border border-linen-200/70 bg-linen-50/95 px-5 py-4 shadow-[0_18px_40px_-22px_rgba(51,35,29,0.6)] backdrop-blur-sm">
              {s.cardEyebrow ? (
                <p className="text-[0.5625rem] uppercase tracking-[0.22em] text-champagne-700">
                  {s.cardEyebrow}
                </p>
              ) : null}
              <p className="font-display mt-1.5 text-[1.0625rem] leading-snug text-ink">
                {s.cardTitle}
              </p>
            </div>
          ) : null}
          {s.detail ? <Detail src={s.detail} className="w-40 xl:w-44" /> : null}
        </div>
      ) : null}

      {/* ── Texto ──────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-6 pt-2 lg:flex lg:min-h-[40rem] lg:items-center lg:pb-24 lg:pt-16">
        <div className="lg:max-w-[36rem]">
          <p className="text-[0.6875rem] uppercase tracking-[0.22em] text-linen-600">
            <span className="numeral">{String(idx + 1).padStart(2, "0")}</span>
            <span className="mx-2 text-linen-400">/</span>
            {s.eyebrow}
          </p>

          <h1 className="font-display-xl mt-5 text-[clamp(2.1rem,3.9vw,3.3rem)] text-ink">
            {s.title}
            {s.titleAccent ? (
              // Sem itálico: Marcellus não tem um, e o oblíquo que o
              // navegador fabricaria entorta o desenho. A segunda linha se
              // separa pela cor, que já basta.
              <span className="mt-1 block text-champagne-600">{s.titleAccent}</span>
            ) : null}
          </h1>

          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-linen-700">
            {s.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link
              href={s.ctaHref}
              tabIndex={ativo ? undefined : -1}
              className="rounded-full bg-champagne-600 px-9 py-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-linen-50 transition-colors hover:bg-champagne-700"
            >
              {s.ctaLabel}
            </Link>

            {s.badge ? (
              <span className="flex flex-col border-l border-linen-300 pl-6 leading-tight">
                <span className="font-display text-2xl text-ink">{s.badge}</span>
                {s.badgeNote ? (
                  <span className="mt-1 text-[0.625rem] uppercase tracking-[0.16em] text-linen-600">
                    {s.badgeNote}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          {s.keywords?.length ? (
            <p className="mt-10 max-w-md border-t border-linen-300 pt-4 text-[0.625rem] uppercase tracking-[0.2em] text-linen-600">
              {s.keywords.join("  •  ")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Foto de detalhe na moldura em octógono, com passe-partout marfim. */
function Detail({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={cn(
        "clip-octagon bg-linen-100 p-1.5 transition-all duration-700 [--cut:0.8rem] sm:p-2 sm:[--cut:1.1rem]",
        className,
      )}
    >
      <div className="clip-octagon relative aspect-square overflow-hidden bg-linen-200 [--cut:0.65rem] sm:[--cut:0.9rem]">
        <Image src={src} alt="" fill sizes="(min-width: 1024px) 11rem, 8rem" className="object-cover" />
      </div>
    </div>
  );
}

/** Monograma com "Perfumaria por Galvão Amorim" em volta, girando devagar. */
function Seal({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      className={cn(
        "rounded-full bg-linen-100 shadow-[0_14px_30px_-18px_rgba(51,35,29,0.55)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="animate-spin-slow absolute inset-0 h-full w-full text-champagne-600">
        <defs>
          <path id={`selo-${id}`} d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1 -90 0" />
        </defs>
        <text
          fill="currentColor"
          fontSize="8.2"
          letterSpacing="2.4"
          style={{ fontFamily: "var(--font-sans)", textTransform: "uppercase" }}
        >
          <textPath href={`#selo-${id}`} textLength="282" lengthAdjust="spacing">
            Perfumaria por Galvão Amorim · Aroma Haus ·
          </textPath>
        </text>
      </svg>
      <Image
        src="/brand/aroma-haus-mark-cacau.svg"
        alt=""
        width={150}
        height={150}
        className="absolute left-1/2 top-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

/**
 * A linha sinuosa do manual: o caminho do aroma no ar. Corre pela base, por
 * baixo do texto, e sobe pela direita até o selo — nunca cruza a chamada.
 * Só no desktop: no celular a foto é pequena demais para ela respirar.
 */
function AromaLine() {
  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 hidden h-full w-full text-champagne-400 lg:block"
      aria-hidden="true"
    >
      <path
        d="M-10 975 C 220 950, 430 995, 620 955 S 840 900, 875 720 S 860 330, 905 200 S 935 120, 935 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
        className="animate-draw"
      />
    </svg>
  );
}
