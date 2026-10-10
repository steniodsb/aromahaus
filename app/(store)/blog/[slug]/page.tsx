import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPostBySlug } from "@/lib/queries";
import { Markdown } from "@/components/markdown";
import { dataBR } from "@/lib/utils";
import { JsonLd } from "@/components/site/json-ld";

export async function generateMetadata(
  props: PageProps<"/blog/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Artigo não encontrado" };
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    openGraph: {
      type: "article",
      title: post.seo_title ?? post.title,
      description: post.seo_description ?? post.excerpt ?? undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_url ?? undefined,
    author: { "@type": "Organization", name: post.author ?? "Aroma Haus" },
    datePublished: post.published_at ?? undefined,
  };

  return (
    <article className="mx-auto max-w-2xl px-6 py-14">
      <JsonLd data={jsonLd} />
      <nav className="mb-8 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-500">
        <Link href="/blog" className="transition-colors hover:text-champagne-500">
          Diário
        </Link>
        <span className="mx-2.5">/</span>
        <span className="text-linen-700">Artigo</span>
      </nav>

      <p className="eyebrow">Diário</p>
      <h1 className="font-display-xl rule mt-4 text-[clamp(2rem,5vw,3rem)] leading-[1.08] text-ink">
        {post.title}
      </h1>
      <p className="mt-6 text-xs text-linen-500">
        {post.published_at && (
          <time dateTime={post.published_at} className="numeral">
            {dataBR(post.published_at)}
          </time>
        )}
        {post.published_at && post.author && <span className="mx-2">·</span>}
        {post.author && <span>Por {post.author}</span>}
      </p>

      {post.cover_url && (
        <div className="relative mt-10 aspect-[4/3] overflow-hidden rounded-sm bg-linen-100">
          <Image
            src={post.cover_url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* O formulário do admin sempre disse "Conteúdo (Markdown)", mas a página
          imprimia o texto cru — `##` e `**` apareciam na tela do leitor. */}
      <div className="mt-10 [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-[1.5rem] [&_h2]:font-normal [&_h2]:text-ink [&_h3]:font-display [&_h3]:font-normal [&_h3]:text-ink [&_p]:text-base [&_p]:leading-[1.8] [&_p]:text-linen-700 [&_li]:text-base [&_li]:text-linen-700 [&_strong]:font-medium [&_strong]:text-ink">
        <Markdown content={post.content ?? ""} />
      </div>

      <div className="mt-14 border-t border-line pt-8">
        <Link
          href="/blog"
          className="border-b border-champagne-500 pb-1 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-700 transition-colors hover:text-ink"
        >
          Voltar ao Diário
        </Link>
      </div>
    </article>
  );
}
