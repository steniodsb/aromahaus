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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">
        {page.title}
      </h1>
      <Markdown content={page.content} />

      {/* Fora do markdown de propósito: é ação, não texto. O admin edita a
          política sem risco de quebrar o botão. */}
      <a
        href={whatsappLink("Olá! Quero solicitar uma troca/devolução.")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
      >
        Solicitar pelo WhatsApp
      </a>
    </div>
  );
}
