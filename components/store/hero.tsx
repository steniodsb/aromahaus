"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  image: string | null;
  /** Arte em retrato para o celular. Sem ela, usa a mesma do desktop. */
  imageMobile?: string | null;
  bg?: string | null;
  eyebrow: string;
  title: string;
  /** Segunda linha do título, em itálico — o respiro da composição. */
  titleAccent?: string;
  subtitle: string;
  /** Selo redondo no canto: "até 20% OFF", "frete grátis"… */
  badge?: string | null;
  badgeNote?: string | null;
  ctaLabel: string;
  ctaHref: string;
}

const INTERVALO = 7000;

/**
 * Banner principal da loja.
 *
 * É carrossel de verdade: a vitrine precisa girar entre a chamada da marca, o
 * kit de presente e a promoção de refil, e cada uma dessas tem um público
 * diferente chegando na mesma home.
 *
 * A arte é só cenário — toda a tipografia vive aqui, no HTML. É o que permite
 * ao painel trocar a chamada sem refazer a imagem, e é o que faz o banner
 * continuar legível no celular, onde texto gravado sempre sai pequeno demais.
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
      className="relative isolate overflow-hidden bg-linen-200"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
    >
      <div className="relative min-h-[40rem] sm:min-h-[34rem] lg:min-h-[38rem]">
        {slides.map((s, idx) => {
          const ativo = idx === atual;
          return (
            <div
              key={`${s.title}-${idx}`}
              aria-hidden={!ativo}
              className={cn(
                "inset-0 transition-opacity duration-700",
                ativo ? "relative opacity-100" : "absolute opacity-0",
              )}
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
                    className="hidden object-cover object-right sm:block"
                  />
                  <Image
                    src={s.imageMobile || s.image}
                    alt=""
                    fill
                    priority={idx === 0}
                    sizes="100vw"
                    className="object-cover object-top sm:hidden"
                  />
                </>
              ) : null}

              {/* Véu quente do lado do texto. No celular ele vem de baixo,
                  porque lá o texto fica embaixo do produto, não ao lado. */}
              <div className="absolute inset-0 bg-gradient-to-t from-linen-900/92 from-35% via-linen-900/45 to-transparent sm:bg-gradient-to-r sm:from-linen-900/75 sm:from-0% sm:via-linen-900/25 sm:to-transparent" />

              <div className="relative mx-auto flex min-h-[40rem] max-w-7xl items-end px-6 pb-14 sm:min-h-[34rem] sm:items-center sm:pb-0 lg:min-h-[38rem]">
                <div className="max-w-2xl">
                  <p className="text-[0.6875rem] uppercase tracking-[0.24em] text-champagne-300">
                    {s.eyebrow}
                  </p>

                  <h1 className="font-display-xl mt-4 text-[clamp(2rem,5vw,3.75rem)] text-linen-50">
                    {s.title}
                    {s.titleAccent ? (
                      // Sem itálico: Marcellus não tem um, e o oblíquo que o
                      // navegador fabricaria entorta o desenho. A segunda
                      // linha se separa pela cor, que já basta.
                      <span className="mt-1 block text-champagne-300">
                        {s.titleAccent}
                      </span>
                    ) : null}
                  </h1>

                  <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-linen-200">
                    {s.subtitle}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <Link
                      href={s.ctaHref}
                      className="rounded-full bg-champagne-500 px-9 py-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-linen-900 transition-colors hover:bg-champagne-400"
                    >
                      {s.ctaLabel}
                    </Link>

                    {s.badge ? (
                      <span className="flex flex-col leading-tight">
                        <span className="font-display text-3xl text-linen-50">
                          {s.badge}
                        </span>
                        {s.badgeNote ? (
                          <span className="text-[0.625rem] uppercase tracking-[0.16em] text-linen-300">
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
        <>
          <button
            onClick={() => vai(-1)}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/25 bg-linen-900/25 p-3 text-linen-50 backdrop-blur-sm transition-colors hover:bg-linen-900/50 sm:block"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
          </button>
          <button
            onClick={() => vai(1)}
            aria-label="Próximo banner"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/25 bg-linen-900/25 p-3 text-linen-50 backdrop-blur-sm transition-colors hover:bg-linen-900/50 sm:block"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
          </button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2.5">
            {slides.map((s, idx) => (
              <button
                key={`${s.title}-dot-${idx}`}
                onClick={() => setI(idx)}
                aria-label={`Ver ${s.title}`}
                aria-current={idx === atual}
                className={cn(
                  "h-2 rounded-full transition-all",
                  idx === atual
                    ? "w-8 bg-champagne-400"
                    : "w-2 bg-linen-50/50 hover:bg-linen-50/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
