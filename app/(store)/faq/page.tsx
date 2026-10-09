import type { Metadata } from "next";
import Link from "next/link";
import { GuideSection } from "@/components/store/guide-section";
import { whatsappLink } from "@/lib/utils";
import { getFaq } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Duração do difusor, quantas varetas usar, como funciona o refil, embrulho de presente, prazo de entrega e trocas na Aroma Haus.",
};

export default async function FaqPage() {
  const faq = await getFaq();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 py-14">
        <p className="eyebrow">Ajuda</p>
        <h1 className="font-display-xl rule mt-4 text-[clamp(2rem,4.5vw,3rem)] text-ink">
          Perguntas frequentes
        </h1>
        <p className="mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-linen-700">
          O que mais perguntam antes de comprar. Se a sua dúvida não estiver
          aqui, chama no WhatsApp — respondemos sem enrolação.
        </p>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {faq.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[0.9375rem] text-ink marker:hidden">
                {item.question}
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-champagne-600 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-linen-700">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
          <a
            href={whatsappLink("Olá! Tenho uma dúvida sobre os produtos.")}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
          >
            Falar no WhatsApp
          </a>
          <Link
            href="/trocas-e-devolucoes"
            className="border-b border-champagne-500 pb-1 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-700 transition-colors hover:text-ink"
          >
            Trocas e devoluções
          </Link>
        </div>
      </div>

      {/* "Qual eu compro" é a dúvida mais comum de todas — mora aqui. */}
      <GuideSection />
    </>
  );
}
