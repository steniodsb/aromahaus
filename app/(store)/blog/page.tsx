import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedPosts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Dicas e conteúdo sobre coding automotivo, retrofit e programação veicular para VW, BMW, Audi e BYD.",
};

export default async function BlogPage() {
  const posts = await getPublishedPosts(24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-ink">Blog</h1>

      {posts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden border border-linen-200 bg-linen-50 transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-video bg-linen-100">
                {post.cover_url ? (
                  <Image
                    src={post.cover_url}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-ink text-white/40">
                    Aroma Haus
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-semibold text-ink group-hover:text-champagne-700">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-linen-600">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-none border border-dashed border-linen-300 p-8 text-center text-linen-600">
          Nenhum artigo publicado ainda.
        </p>
      )}
    </div>
  );
}
