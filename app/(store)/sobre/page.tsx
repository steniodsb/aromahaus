import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/utils";
import { BRAND_SIGNATURE, BrandMark } from "@/components/site/brand";

export const metadata: Metadata = {
  title: "A Haus",
  description:
    "A Aroma Haus é a perfumaria de ambiente de Galvão Amorim: difusores, home sprays, sabonetes e refis feitos em pequenos lotes, com essências de grau fino.",
};

const PILARES = [
  {
    title: "Pequenos lotes",
    text: "Cada fragrância é composta e envasada em lotes pequenos. Rende menos, controla mais: um lote que não ficou do jeito certo não sai da casa.",
  },
  {
    title: "Essência de grau fino",
    text: "Trabalhamos com as mesmas famílias de matéria-prima da perfumaria de pele. É o que faz a diferença entre perfumar um ambiente e mascará-lo.",
  },
  {
    title: "Frasco que fica",
    text: "A cerâmica com rosas em relevo e o vidro de tampa dourada foram desenhados para ficar à vista. Por isso todo difusor tem refil: o frasco é para durar.",
  },
];

export default function SobrePage() {
  const whatsapp = whatsappLink(
    "Olá! Vim pelo site da Aroma Haus e queria uma indicação de fragrância.",
  );

  return (
    <div>
      {/* ── Abertura ─────────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-linen-100">
        <div className="mx-auto grid max-w-7xl items-stretch lg:grid-cols-[1fr_1fr]">
          <div className="order-2 flex flex-col justify-center px-6 py-16 sm:px-10 lg:order-1 lg:py-24 lg:pr-16">
            <BrandMark className="h-12 w-auto" />
            <p className="eyebrow mt-8">A Haus</p>
            <h1 className="font-display-xl mt-5 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.08] text-ink">
              Uma casa tem cheiro antes de ter mobília
            </h1>
            <p className="mt-7 max-w-md text-[0.9375rem] leading-relaxed text-linen-700">
              A Aroma Haus nasceu de uma obsessão pequena: a de que ambiente bom
              não se decora só com o que se vê. Fazemos perfumaria de ambiente em
              pequenos lotes — difusores de varetas, home sprays, sabonetes
              líquidos e refis — com fragrâncias compostas aqui, uma a uma.
            </p>
            <p className="mt-6 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-600">
              {BRAND_SIGNATURE}
            </p>
          </div>

          <div className="relative order-1 min-h-[20rem] lg:order-2 lg:min-h-[34rem]">
            <Image
              src="/home/hero.webp"
              alt="Difusor e sabonetes Aroma Haus sobre pedestais de linho"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Pilares ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-14 max-w-xl">
          <p className="eyebrow">Como fazemos</p>
          <h2 className="font-display rule mt-4 text-3xl leading-tight text-ink">
            Três decisões que não abrimos mão
          </h2>
        </div>

        <div className="grid gap-x-12 gap-y-12 md:grid-cols-3">
          {PILARES.map((p, i) => (
            <div key={p.title} className="border-t border-linen-300 pt-7">
              <span className="font-display text-2xl text-champagne-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display mt-3 text-2xl text-ink">{p.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-linen-700">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── O perfumista ─────────────────────────────────────────────────── */}
      <section className="surface-linen border-y border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="eyebrow">O perfumista</p>
          <h2 className="font-display-xl mt-5 text-[clamp(1.75rem,3.6vw,2.75rem)] leading-tight text-ink">
            Galvão Amorim
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-linen-700">
            Cada fragrância da casa passa pela mesma mão. Não terceirizamos a
            composição: as notas são escolhidas, testadas no ambiente real e
            ajustadas até a abertura, o corpo e o fundo se sustentarem pelas
            semanas que o difusor leva para acabar — e não só nos primeiros dias.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-linen-700">
            É um método lento e é de propósito. Fragrância de ambiente que
            impressiona na primeira semana e cansa na terceira foi composta para
            a loja, não para a casa.
          </p>
        </div>
      </section>

      {/* ── Chamada ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="font-display-xl text-[clamp(1.75rem,3.6vw,2.75rem)] leading-tight text-ink">
          Comece pela fragrância
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-linen-700">
          Escolha o cheiro primeiro; o formato a gente ajuda a decidir. Se ficar
          em dúvida, conte onde vai usar — respondemos com uma indicação, não com
          um catálogo.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link
            href="/produtos"
            className="border border-linen-900 bg-linen-900 px-9 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
          >
            Ver fragrâncias
          </Link>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-b border-champagne-500 pb-1 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-700 transition-colors hover:text-ink"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.4} /> Falar no WhatsApp
            </a>
          ) : (
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 border-b border-champagne-500 pb-1 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-700 transition-colors hover:text-ink"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.4} /> Falar com a gente
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
