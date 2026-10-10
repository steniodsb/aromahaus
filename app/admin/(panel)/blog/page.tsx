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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">
            Blog <span className="numeral text-base text-linen-500">({total})</span>
          </h1>
          <p className="mt-1 text-sm text-linen-600">
            Artigos sobre aromas, cuidados com a casa e como usar cada produto. Rascunhos ficam escondidos até você publicar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ListSearch action="/admin/blog" q={busca} placeholder="Título ou slug" />
          <Link href="/admin/blog/novo" className="inline-flex items-center gap-2 rounded bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700">
            <Plus className="h-4 w-4" /> Novo artigo
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-[0.6875rem] uppercase tracking-[0.12em] text-linen-600">
            <tr>
              <th className="p-3">Título</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linen-200">
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-linen-100">
                <td className="p-3">
                  <Link href={`/admin/blog/${p.id}`} className="text-ink hover:text-champagne-700">
                    {p.title}
                  </Link>
                </td>
                <td className="p-3">
                  <span className={p.status === "published" ? "rounded bg-success/15 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-success" : "rounded bg-linen-200 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-linen-600"}>
                    {p.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </td>
                <td className="p-3">
                  <PostRowActions id={p.id} />
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={3} className="p-10 text-center text-sm text-linen-600">
                  {busca
                    ? "Nenhum artigo com esse termo. Procure pelo título ou pelo slug."
                    : "Nenhum artigo ainda. Use Novo artigo para escrever o primeiro, por exemplo um guia de como escolher o aroma de cada ambiente."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination action="/admin/blog" page={pagina} total={total} perPage={POR_PAGINA} params={{ q: busca }} />
    </div>
  );
}
