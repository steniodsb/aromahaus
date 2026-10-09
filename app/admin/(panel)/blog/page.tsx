import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/types";
import { PostRowActions } from "@/components/admin/post-row-actions";
import { ListSearch, Pagination, escapeLike } from "@/components/admin/list-toolbar";

const POR_PAGINA = 25;

export default async function AdminBlogPage(
  props: PageProps<"/admin/blog">,
) {
  const sp = await props.searchParams;
  const busca = (typeof sp.q === "string" ? sp.q : "").trim();
  const pagina = Math.max(1, Number(typeof sp.p === "string" ? sp.p : 1) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("blog_posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (busca) {
    const termo = escapeLike(busca);
    query = query.or(`title.ilike.%${termo}%,slug.ilike.%${termo}%`);
  }

  const de = (pagina - 1) * POR_PAGINA;
  const { data, count } = await query.range(de, de + POR_PAGINA - 1);
  const posts = (data as BlogPost[]) ?? [];
  const total = count ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink">
          Blog <span className="text-base font-normal text-linen-500">({total})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <ListSearch action="/admin/blog" q={busca} placeholder="Título ou slug" />
          <Link href="/admin/blog/novo" className="inline-flex items-center gap-2 rounded-lg bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700">
            <Plus className="h-4 w-4" /> Novo artigo
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-xs uppercase text-linen-600">
            <tr>
              <th className="p-3">Título</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-linen-100 last:border-0 hover:bg-linen-100">
                <td className="p-3">
                  <Link href={`/admin/blog/${p.id}`} className="font-medium text-ink hover:text-champagne-700">
                    {p.title}
                  </Link>
                </td>
                <td className="p-3">
                  <span className={p.status === "published" ? "rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success" : "rounded-full bg-linen-200 px-2 py-0.5 text-xs font-medium text-linen-600"}>
                    {p.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </td>
                <td className="p-3">
                  <PostRowActions id={p.id} />
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={3} className="p-8 text-center text-linen-600">Nenhum artigo ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    <Pagination action="/admin/blog" page={pagina} total={total} perPage={POR_PAGINA} params={{ q: busca }} />
    </div>
  );
}
