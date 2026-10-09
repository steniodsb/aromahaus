"use client";

import { useState } from "react";
import { savePost } from "@/app/admin/(panel)/blog/actions";
import { ImageField } from "@/components/admin/image-field";
import type { BlogPost } from "@/lib/types";

export function PostForm({ post }: { post?: BlogPost | null }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cover, setCover] = useState(post?.cover_url ?? "");
  const input = "w-full rounded-lg border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600";
  const label = "mb-1 block text-sm font-medium text-linen-700";

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        // Sem try/catch: no sucesso a action redireciona, e um catch aqui
        // engoliria a navegação. Erro vem no retorno, não por exceção.
        const res = await savePost(fd);
        if (res?.error) setError(res.error);
        setSaving(false);
      }}
      className="grid gap-6 lg:grid-cols-3"
    >
      {post?.id && <input type="hidden" name="id" value={post.id} />}

      <div className="space-y-4 lg:col-span-2">
        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <div className="mb-4">
            <label className={label}>Título *</label>
            <input name="title" required defaultValue={post?.title} className={input} />
          </div>
          <div className="mb-4">
            <label className={label}>Slug</label>
            <input name="slug" defaultValue={post?.slug} placeholder="gerado do título se vazio" className={input} />
          </div>
          <div className="mb-4">
            <label className={label}>Resumo</label>
            <textarea name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Conteúdo (Markdown)</label>
            <textarea name="content" rows={16} defaultValue={post?.content ?? ""} className={`${input} font-mono text-sm`} />
          </div>
        </div>

        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <h3 className="mb-4 font-semibold text-ink">SEO</h3>
          <div className="mb-4">
            <label className={label}>Título SEO</label>
            <input name="seo_title" defaultValue={post?.seo_title ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Descrição SEO</label>
            <textarea name="seo_description" rows={2} defaultValue={post?.seo_description ?? ""} className={input} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <div className="mb-4">
            <label className={label}>Status</label>
            <select name="status" defaultValue={post?.status ?? "draft"} className={input}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
            </select>
          </div>
          <div className="mb-4">
            <label className={label}>Autor</label>
            <input name="author" defaultValue={post?.author ?? "Aroma Haus"} className={input} />
          </div>
          <div>
            <label className={label}>Tags (vírgula)</label>
            <input name="tags" defaultValue={(post?.tags ?? []).join(", ")} className={input} />
          </div>
        </div>

        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          {/* O ImageField guarda a URL em estado; o hidden é quem leva o valor
              para o FormData que a server action recebe. */}
          <input type="hidden" name="cover_url" value={cover} />
          <ImageField
            label="Imagem de capa"
            value={cover}
            onChange={setCover}
            folder="blog"
            spec="blog"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button type="submit" disabled={saving} className="w-full rounded bg-linen-900 py-2.5 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-50 transition-colors hover:bg-champagne-700 disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar artigo"}
        </button>
      </div>
    </form>
  );
}
