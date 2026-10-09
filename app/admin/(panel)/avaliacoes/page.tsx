import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewRow, type ReviewRowData } from "@/components/admin/review-row";

export const metadata = { title: "Avaliações" };

const ABAS = [
  { key: "pending", label: "Aguardando" },
  { key: "approved", label: "Publicadas" },
  { key: "rejected", label: "Recusadas" },
] as const;

export default async function AvaliacoesPage(
  props: PageProps<"/admin/avaliacoes">,
) {
  const sp = await props.searchParams;
  const status =
    typeof sp.status === "string" && ABAS.some((a) => a.key === sp.status)
      ? sp.status
      : "pending";

  const supabase = await createClient();
  const [{ data: reviews }, { data: contagem }] = await Promise.all([
    supabase
      .from("reviews")
      .select("*, products(name, slug)")
      .eq("status", status)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("status"),
  ]);

  const total = (s: string) =>
    (contagem ?? []).filter((r) => r.status === s).length;

  const linhas: ReviewRowData[] = (
    (reviews ?? []) as (ReviewRowData & {
      products: { name: string; slug: string } | null;
    })[]
  ).map((r) => ({
    ...r,
    product_name: r.products?.name ?? null,
    product_slug: r.products?.slug ?? null,
  }));

  return (
    <div>
      <h1 className="mb-1 text-2xl text-ink">Avaliações</h1>
      <p className="mb-6 text-sm text-linen-600">
        Toda avaliação chega aqui antes de aparecer na loja. Publique as críticas
        também — vitrine só com cinco estrelas ninguém acredita.
      </p>

      <nav className="mb-6 flex gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.key}
            href={`/admin/avaliacoes?status=${a.key}`}
            className={
              a.key === status
                ? "border border-linen-900 bg-linen-900 px-4 py-2 text-xs text-linen-50"
                : "border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
            }
          >
            {a.label}
            <span className="ml-2 opacity-60">{total(a.key)}</span>
          </Link>
        ))}
      </nav>

      {linhas.length > 0 ? (
        <div className="space-y-4">
          {linhas.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-linen-300 p-10 text-center text-sm text-linen-600">
          {status === "pending"
            ? "Nenhuma avaliação esperando moderação."
            : "Nada por aqui."}
        </p>
      )}
    </div>
  );
}
