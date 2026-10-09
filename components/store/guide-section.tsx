import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

/**
 * O "qual eu compro" respondido antes da dúvida virar carrinho abandonado.
 *
 * É a pergunta que mais chega no WhatsApp de uma perfumaria de ambiente.
 * Com imagem e número grande, e não como três colunas de texto: aqui o
 * cliente está comparando objetos, e comparação sem foto não acontece.
 */
const ITENS = [
  {
    n: "01",
    eyebrow: "Para o dia a dia",
    title: "Difusor de varetas",
    text: "Trabalha sozinho por meses e dá à casa um cheiro próprio. Sem chama, sem tomada: monte uma vez e esqueça.",
    tag: "3 a 5 meses",
    image: "/categorias/difusores.webp",
    href: "/categoria/difusores",
    cta: "Ver difusores",
  },
  {
    n: "02",
    eyebrow: "Para o agora",
    title: "Home spray",
    text: "Resolve em segundos — antes das visitas, depois de cozinhar. Borrife no tecido, não no ar: é lá que o perfume fica.",
    tag: "Efeito imediato",
    image: "/categorias/home-sprays.webp",
    href: "/categoria/home-sprays",
    cta: "Ver home sprays",
  },
  {
    n: "03",
    eyebrow: "Para o lavabo",
    title: "Sabonete líquido",
    text: "Cerâmica com rosas em relevo, feita para ficar à vista. Fórmula suave, que limpa sem repuxar.",
    tag: "Fica na bancada",
    image: "/categorias/sabonetes-liquidos.webp",
    href: "/categoria/sabonetes-liquidos",
    cta: "Ver sabonetes",
  },
];

export function GuideSection() {
  return (
    <section className="surface-linen border-y border-line">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="eyebrow">Na dúvida</p>
            <h2 className="font-display-xl mt-3 text-[clamp(1.75rem,3.6vw,2.75rem)] leading-tight text-ink">
              Cada um resolve um problema diferente
            </h2>
          </div>
          <Link
            href="/faq"
            className="group inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700 transition-colors hover:text-champagne-700"
          >
            Tirar outras dúvidas
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              strokeWidth={1.5}
            />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {ITENS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="group flex flex-col overflow-hidden rounded-sm bg-linen-50 shadow-[0_10px_30px_-24px_rgba(43,39,34,0.6)] transition-shadow hover:shadow-[0_22px_45px_-26px_rgba(43,39,34,0.65)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-linen-100">
                <Image
                  src={it.image}
                  alt=""
                  fill
                  sizes="(max-width:768px) 100vw, 33vw"
                  className="object-cover object-center transition-transform duration-[900ms] group-hover:scale-[1.06]"
                />
                <span className="absolute left-4 top-4 rounded-full bg-linen-50/90 px-3 py-1 text-[0.625rem] uppercase tracking-[0.12em] text-linen-700 backdrop-blur-sm">
                  {it.tag}
                </span>
                <span className="font-display absolute bottom-3 right-5 text-5xl leading-none text-linen-900/25">
                  {it.n}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <p className="eyebrow">{it.eyebrow}</p>
                <h3 className="font-display mt-3 text-2xl text-ink">{it.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-linen-700">
                  {it.text}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] text-champagne-700">
                  {it.cta}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
