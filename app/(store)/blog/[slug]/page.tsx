import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPostBySlug } from "@/lib/queries";
import { Markdown } from "@/components/markdown";

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
    <article className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 text-sm text-linen-600">
        <Link href="/blog" className="hover:text-champagne-700">Blog</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{post.title}</span>
      </nav>

      {post.cover_url && (
        <div className="relative mb-8 aspect-video overflow-hidden">
          <Image
            src={post.cover_url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      )}

      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{post.title}</h1>
      {post.author && (
        <p className="mt-2 text-sm text-linen-600">Por {post.author}</p>
      )}

      {/* O formulário do admin sempre disse "Conteúdo (Markdown)", mas a página
          imprimia o texto cru — `##` e `**` apareciam na tela do leitor. */}
      <div className="mt-8">
        <Markdown content={post.content ?? ""} />
      </div>
    </article>
  );
}
