"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { savePage } from "@/app/admin/(panel)/paginas/actions";
import type { PageContent } from "@/lib/pages-defaults";

export function PageEditor({ page }: { page: PageContent }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const input =
    "w-full rounded-lg border border-linen-300 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1 block text-sm font-medium text-linen-700";

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        setSalvo(false);
        const res = await savePage(fd);
        if (res?.error) setError(res.error);
        else setSalvo(true);
        setSaving(false);
      }}
      className="rounded border border-linen-200 bg-linen-50 p-5"
    >
      <input type="hidden" name="slug" value={page.slug} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{page.title}</h2>
        <Link
          href={`/${page.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-linen-600 hover:text-champagne-700"
        >
          /{page.slug} <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="mb-4">
        <label className={label}>Título</label>
        <input name="title" required defaultValue={page.title} className={input} />
      </div>

      <div className="mb-4">
        <label className={label}>Conteúdo</label>
        <textarea
          name="content"
          rows={14}
          defaultValue={page.content}
          className={`${input} font-mono text-xs leading-relaxed`}
        />
        <p className="mt-1 text-xs text-linen-600">
          Use <code className="rounded bg-linen-100 px-1">## Título</code> para
          seções, <code className="rounded bg-linen-100 px-1">**negrito**</code>,
          <code className="ml-1 rounded bg-linen-100 px-1">- item</code> para
          lista e <code className="rounded bg-linen-100 px-1">[texto](link)</code>{" "}
          para link. Linha em branco separa parágrafos.
        </p>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Título no Google</label>
          <input name="seo_title" defaultValue={page.seo_title} className={input} />
        </div>
        <div>
          <label className={label}>Descrição no Google</label>
          <input name="seo_description" defaultValue={page.seo_description} className={input} />
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-champagne-600 px-6 py-2 text-sm font-semibold text-white hover:bg-champagne-700 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar página"}
        </button>
        {salvo && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </form>
  );
}
