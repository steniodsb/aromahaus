import Link from "next/link";
import type { Metadata } from "next";
import { getPage } from "@/lib/pages";
import { Markdown } from "@/components/markdown";
import { whatsappLink } from "@/lib/utils";

const SLUG = "trocas-e-devolucoes";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG);
  return {
    title: page?.seo_title ?? page?.title,
    description: page?.seo_description,
  };
}

export default async function TrocasPage() {
  const page = await getPage(SLUG);
  if (!page) return null;
  const trocaWhats = whatsappLink("Olá! Quero solicitar uma troca/devolução.");

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <p className="eyebrow">Ajuda</p>
      <h1 className="font-display-xl rule mt-4 text-[clamp(2rem,4.5vw,3rem)] text-ink">
        {page.title}
      </h1>
      <p className="mt-7 text-[0.9375rem] leading-relaxed text-linen-700">
        Como trocar ou devolver um pedido, em quais prazos e o que precisamos de você.
      </p>

      <div className="mt-10 space-y-4 border-t border-line pt-2 leading-relaxed [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-[1.375rem] [&_h2]:font-normal [&_h2]:text-ink [&_h3]:font-display [&_h3]:font-normal [&_h3]:text-ink [&_p]:text-[0.9375rem] [&_li]:text-[0.9375rem] [&_p]:text-linen-700 [&_li]:text-linen-700 [&_strong]:font-medium [&_strong]:text-ink [&_a]:text-ink [&_a]:underline-offset-4">
        <Markdown content={page.content} />
      </div>

      {/* Fora do markdown de propósito: é ação, não texto. O admin edita a
          política sem risco de quebrar o botão. */}
      {trocaWhats ? (
        <a
          href={trocaWhats}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
        >
          Solicitar pelo WhatsApp
        </a>
      ) : (
        <Link href="/contato" className="mt-10 inline-flex border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink">
          Solicitar troca ou devolução
        </Link>
      )}
    </div>
  );
}
