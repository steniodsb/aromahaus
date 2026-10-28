import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Gift, PenLine, ReceiptText } from "lucide-react";
import {
  getAllProducts,
  getCategoryBySlug,
  getProductsByCategory,
  getWishlistIds,
  withProductDetails,
} from "@/lib/queries";
import { ProductCard } from "@/components/store/product-card";
import { CollectionHeader } from "@/components/store/collection-header";
import { formatBRL } from "@/lib/utils";
import type { ProductWithDetails } from "@/lib/types";

export const metadata: Metadata = {
  title: "Para presentear",
  description:
    "Embrulho em papel seda, cartão escrito à mão e nota fiscal fora da caixa. Perfumaria de ambiente para presentear, da Aroma Haus.",
};

/**
 * Faixas de preço.
 *
 * É assim que se escolhe presente: a pessoa já chega com um teto em mente e
 * quer ver o que cabe nele. Ordenar por "relevância" não ajuda ninguém que
 * tem R$ 150 para gastar no amigo-secreto.
 */
const FAIXAS = [
  { ate: 130, titulo: "Até R$ 130", nota: "Amigo-secreto e lembrancinha" },
  { ate: 200, titulo: "Até R$ 200", nota: "O presente de sempre" },
  { ate: 300, titulo: "Até R$ 300", nota: "Aniversário e casa nova" },
  { ate: Infinity, titulo: "Acima de R$ 300", nota: "Quando é para impressionar" },
];

const SERVICOS = [
  {
    icon: Gift,
    title: "Embrulho em papel seda",
    text: "Fita de cetim e a caixa da casa. Sem custo, é só marcar no checkout.",
  },
  {
    icon: PenLine,
    title: "Cartão escrito à mão",
    text: "Você escreve a mensagem no checkout; a gente transcreve no cartão de papel algodão.",
  },
  {
    icon: ReceiptText,
    title: "Nota fiscal fora da caixa",
    text: "Quem recebe nunca vê o preço. A nota vai colada do lado de fora, no envelope da transportadora.",
  },
];

/** Menor preço vendável — com tamanhos, é o que a vitrine mostra. */
function precoDe(p: ProductWithDetails) {
  const precos = p.variants.length
    ? p.variants.map((v) => Number(v.price))
    : [Number(p.price)];
  return Math.min(...precos);
}

export default async function PresentesPage() {
  const categoria = await getCategoryBySlug("kits-presentes");
  const [todos, kitsRaw, savedIds] = await Promise.all([
    getAllProducts(),
    categoria ? getProductsByCategory(categoria.id) : Promise.resolve([]),
    getWishlistIds(),
  ]);
  const [produtos, kits] = await Promise.all([
    withProductDetails(todos),
    withProductDetails(kitsRaw),
  ]);

  const compraveis = produtos.filter((p) => precoDe(p) > 0);
  const faixas = FAIXAS.map((f, i) => {
    const piso = i === 0 ? 0 : FAIXAS[i - 1].ate;
    const itens = compraveis
      .filter((p) => precoDe(p) > piso && precoDe(p) <= f.ate)
      .sort((a, b) => precoDe(a) - precoDe(b));
    return { ...f, itens };
  }).filter((f) => f.itens.length > 0);

  return (
    <>
      <CollectionHeader
        tone="ink"
        eyebrow="Para presentear"
        title="Um presente que fica na casa"
        text="Perfume de ambiente é o presente que a pessoa usa todo dia sem lembrar que ganhou — e lembra de novo toda vez que alguém elogia o cheiro da sala."
      />

      {/* ── Serviços de presente ─────────────────────────────────────────── */}
      <section className="border-b border-line bg-linen-100">
        <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-8 px-6 py-12 md:grid-cols-3">
          {SERVICOS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-champagne-200/70 text-champagne-700">
                <Icon className="h-5 w-5" strokeWidth={1.3} />
              </span>
              <div>
                <h2 className="text-[0.9375rem] text-ink">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-linen-700">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Kits prontos ─────────────────────────────────────────────────── */}
      {kits.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Sem pensar muito</p>
              <h2 className="font-display mt-3 text-3xl text-ink">Kits prontos</h2>
            </div>
            <Link
              href="/categoria/kits-presentes"
              className="text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700 transition-colors hover:text-champagne-700"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {kits.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} saved={savedIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Por faixa de preço ───────────────────────────────────────────── */}
      {faixas.map((f, i) => (
        <section
          key={f.titulo}
          className={i % 2 === 1 ? "surface-linen border-y border-line" : ""}
        >
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">{f.nota}</p>
                <h2 className="font-display mt-3 text-3xl text-ink">{f.titulo}</h2>
              </div>
              <span className="text-xs text-linen-600">
                {f.itens.length} {f.itens.length === 1 ? "opção" : "opções"} · a
                partir de {formatBRL(precoDe(f.itens[0]))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {f.itens.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} saved={savedIds.has(p.id)} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── Chamada final ────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/home/promo-kits.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linen-900/75" />
        <div className="relative mx-auto max-w-2xl px-6 py-20 text-center">
          <h2 className="font-display-xl text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-linen-50">
            Não sabe qual fragrância a pessoa gosta?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-linen-300">
            Conte um pouco sobre ela e sobre a casa dela. A gente indica — e, se
            errar, trocamos a fragrância sem complicação em até 15 dias.
          </p>
          <Link
            href="/contato"
            className="mt-9 inline-block rounded-full bg-champagne-500 px-9 py-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-linen-900 transition-colors hover:bg-champagne-400"
          >
            Pedir uma indicação
          </Link>
        </div>
      </section>
    </>
  );
}
