import type { Metadata } from "next";
import { getPage } from "@/lib/pages";
import { Markdown } from "@/components/markdown";

const SLUG = "termos-de-uso";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG);
  return {
    title: page?.seo_title ?? page?.title,
    description: page?.seo_description,
  };
}

export default async function TermosPage() {
  const page = await getPage(SLUG);
  if (!page) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">
        {page.title}
      </h1>
      <Markdown content={page.content} />
    </div>
  );
}
