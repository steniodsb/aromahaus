"use client";

import { useEffect, useRef, useState } from "react";
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
}

const INTERVALO = 7000;

/**
 * Banner principal da loja.
 *
 * Segue a página da apresentação da marca: marfim de fundo, texto em cacau à
 * esquerda e a foto emoldurada à direita, com o número do slide no olho do
 * título ("01 / Perfumaria de ambiente"). Nada de foto em tela cheia com véu
 * escuro por cima — a marca é "elegância silenciosa", e a foto escura de
 * ponta a ponta brigava com o resto da loja, que é clara.
 *
 * Continua carrossel: a vitrine gira entre a chamada da marca, o kit de
 * presente e o refil, e cada um fala com um público diferente. Toda a
 * tipografia vive no HTML, para o painel trocar a chamada sem refazer a arte.
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
        {slides.map((s, idx) => {
          const ativo = idx === atual;
          return (
            <div
              key={`${s.title}-${idx}`}
              aria-hidden={!ativo}
              className={cn(
                "[grid-area:1/1] transition-opacity duration-700",
                ativo ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 pb-6 pt-6 lg:grid-cols-[1fr_1.08fr] lg:gap-16 lg:pb-8 lg:pt-12">
                {/* Foto emoldurada */}
                <div
                  className="relative aspect-[5/4] overflow-hidden rounded-sm bg-linen-200 lg:order-2 lg:aspect-[6/5]"
                  style={s.bg ? { background: s.bg } : undefined}
                >
                  {s.image ? (
                    <>
                      <Image
                        src={s.image}
                        alt=""
                        fill
                        priority={idx === 0}
                        sizes="(min-width: 1024px) 52vw, 100vw"
                        className={cn(
                          "object-cover transition-transform duration-[7000ms] ease-out",
                          s.imageMobile ? "hidden lg:block" : "",
                          ativo ? "scale-[1.04]" : "scale-100",
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
                </div>

                {/* Texto */}
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
                      // navegador fabricaria entorta o desenho. A segunda
                      // linha se separa pela cor, que já basta.
                      <span className="mt-1 block text-champagne-600">
                        {s.titleAccent}
                      </span>
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
                        <span className="font-display text-2xl text-ink">
                          {s.badge}
                        </span>
                        {s.badgeNote ? (
                          <span className="mt-1 text-[0.625rem] uppercase tracking-[0.16em] text-linen-600">
                            {s.badgeNote}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
