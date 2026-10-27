"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  image: string | null;
  /** Arte própria para o celular. Sem ela, usa a mesma do desktop. */
  imageMobile?: string | null;
  /** Cor de fundo da moldura enquanto a foto carrega (ou sem foto). */
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
  /** Foto de detalhe sobreposta no canto (fita, tag, refil). Opcional. */
  detail?: string | null;
  /** Ficha sobre a foto: o produto em destaque. Opcional. */
  cardEyebrow?: string | null;
  cardTitle?: string | null;
  /** Linha de palavras sob um fio, como na apresentação da marca. Opcional. */
  keywords?: string[];
}

const INTERVALO = 7000;

/**
 * Banner principal da loja.
 *
 * Composição tirada da apresentação da marca: marfim de fundo, texto em cacau
 * à esquerda e, à direita, uma peça em camadas —
 *   · a foto principal na moldura em octógono do monograma "ah";
 *   · uma foto de detalhe sobreposta no canto (fita, tag, refil);
 *   · o selo com "Perfumaria por Galvão Amorim" girando em círculo;
 *   · a ficha do produto em destaque;
 *   · a linha sinuosa do manual ("o caminho do aroma no ar") por trás.
 * Cada canto tem um papel, e nada fica por cima do texto.
 *
 * Os extras são opcionais: um banner do painel só com foto e texto vira a
 * mesma composição, sem detalhe e sem ficha. Toda a tipografia vive no HTML,
 * para o painel trocar a chamada sem refazer a arte.
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
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-6 pb-8 lg:pb-12">
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
              className="rounded-full border border-linen-300 p-2.5 text-linen-700 transition-colors hover:border-champagne-600 hover:text-champagne-600"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
            </button>
            <button
              onClick={() => vai(1)}
              aria-label="Próximo banner"
              className="rounded-full border border-linen-300 p-2.5 text-linen-700 transition-colors hover:border-champagne-600 hover:text-champagne-600"
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
  return (
    <div
      aria-hidden={!ativo}
      className={cn(
        "[grid-area:1/1] transition-opacity duration-700",
        ativo ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-6 pt-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:pb-8 lg:pt-14">
        {/* ── Composição ───────────────────────────────────────────── */}
        <div className="relative pb-10 pl-5 pr-3 pt-5 sm:pb-14 sm:pl-12 sm:pr-4 sm:pt-8 lg:order-2">
          {/* Linha do aroma: renderizada só no slide ativo, para se
              redesenhar a cada entrada. */}
          {ativo ? <AromaLine /> : null}

          <div
            className="clip-octagon relative aspect-[6/5] overflow-hidden bg-linen-200 [--cut:1.5rem] sm:[--cut:2.25rem]"
            style={s.bg ? { background: s.bg } : undefined}
          >
            {s.image ? (
              <>
                <Image
                  src={s.image}
                  alt=""
                  fill
                  priority={idx === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className={cn(
                    "object-cover transition-transform duration-[7000ms] ease-out",
                    s.imageMobile ? "hidden lg:block" : "",
                    ativo ? "scale-[1.05]" : "scale-100",
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

            {/* Ficha do produto em destaque */}
            {s.cardTitle ? (
              <div className="absolute bottom-4 right-4 hidden max-w-[15rem] border border-linen-200/70 bg-linen-50/95 px-5 py-4 shadow-[0_18px_40px_-22px_rgba(51,35,29,0.6)] backdrop-blur-sm sm:block lg:bottom-6 lg:right-6">
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
          </div>

          {/* Detalhe sobreposto, com passe-partout marfim */}
          {s.detail ? (
            <div
              className={cn(
                "clip-octagon absolute bottom-0 left-0 w-[34%] bg-linen-100 p-1.5 [--cut:0.9rem] sm:p-2 sm:[--cut:1.15rem]",
                "transition-all duration-700",
                ativo ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
            >
              <div className="clip-octagon relative aspect-square overflow-hidden bg-linen-200 [--cut:0.75rem] sm:[--cut:0.95rem]">
                <Image
                  src={s.detail}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 18vw, 34vw"
                  className="object-cover"
                />
              </div>
            </div>
          ) : null}

          <Seal className="absolute -top-1 right-0 h-[5.5rem] w-[5.5rem] sm:-top-2 sm:h-28 sm:w-28" />
        </div>

        {/* ── Texto ────────────────────────────────────────────────── */}
        <div className="lg:order-1 lg:py-6">
          <p className="text-[0.6875rem] uppercase tracking-[0.22em] text-linen-600">
            <span className="numeral">{String(idx + 1).padStart(2, "0")}</span>
            <span className="mx-2 text-linen-400">/</span>
            {s.eyebrow}
          </p>

          <h1 className="font-display-xl mt-5 text-[clamp(2.1rem,4.4vw,3.6rem)] text-ink">
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

/** A linha sinuosa do manual: o caminho do aroma no ar. */
function AromaLine() {
  return (
    <svg
      viewBox="0 0 600 500"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -left-16 -right-6 inset-y-0 -z-10 h-full w-[calc(100%+5.5rem)] text-linen-400"
      aria-hidden="true"
    >
      <path
        // Contorna a moldura por fora — sobe pela margem esquerda e corre
        // pelo topo até o selo — para não sumir atrás da foto.
        d="M0 495 C 40 470, 70 420, 72 330 S 60 120, 80 40 S 200 8, 330 14 S 470 20, 520 6"
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
