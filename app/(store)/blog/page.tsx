import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedPosts } from "@/lib/queries";
import { dataBR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Diário",
  description:
    "Como usar o difusor, escolher a fragrância e cuidar do aroma da casa. Notas da Aroma Haus.",
};

export default async function BlogPage() {
  const posts = await getPublishedPosts(24);

  return (
    <div className="mx-auto max-w-7xl px-6 py-14">
      <p className="eyebrow">Diário</p>
      <h1 className="font-display-xl rule mt-4 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] text-ink">
        Notas sobre aroma e casa
      </h1>
      <p className="mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-linen-700">
        Como usar o difusor, escolher a fragrância e fazer o perfume durar mais.
      </p>

      {posts.length > 0 ? (
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-linen-100">
                {post.cover_url ? (
                  <Image
                    src={post.cover_url}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="font-display flex h-full items-center justify-center bg-linen-200 text-linen-500">
                    Aroma Haus
                  </div>
                )}
              </div>
              <div className="mt-5 flex flex-1 flex-col">
                {post.published_at && (
                  <time
                    dateTime={post.published_at}
                    className="numeral text-[0.6875rem] uppercase tracking-[0.14em] text-linen-500"
                  >
                    {dataBR(post.published_at)}
                  </time>
                )}
                <h2 className="font-display mt-2 text-[1.375rem] leading-snug text-ink transition-colors group-hover:text-champagne-700">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-linen-700">
                    {post.excerpt}
                  </p>
                )}
                <span className="mt-5 self-start border-b border-champagne-500 pb-1 text-[0.6875rem] uppercase tracking-[0.18em] text-linen-700 transition-colors group-hover:text-ink">
                  Ler artigo
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-12 border border-dashed border-linen-300 px-6 py-20 text-center text-sm text-linen-700">
          Nenhum artigo publicado ainda.
        </p>
      )}
    </div>
  );
}
