import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import type { Coupon } from "@/lib/types";
import { CouponRowActions } from "@/components/admin/coupon-row-actions";
import { ListSearch, escapeLike } from "@/components/admin/list-toolbar";

async function getCoupons(busca: string): Promise<Coupon[]> {
  const supabase = await createClient();
  let query = supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (busca) {
    const termo = escapeLike(busca);
    query = query.or(`code.ilike.%${termo}%,description.ilike.%${termo}%`);
  }

  const { data } = await query;
  return (data as Coupon[]) ?? [];
}

function descontoLabel(c: Coupon) {
  if (c.type === "free_shipping") return "Frete grátis";
  if (c.type === "percent") {
    return `${Number(c.value)}%${c.max_discount ? ` (até ${formatBRL(Number(c.max_discount))})` : ""}`;
  }
  return formatBRL(Number(c.value));
}

/**
 * Estado real do cupom — "ativo" na coluna não basta: um cupom marcado como
 * ativo mas expirado ou esgotado não funciona, e quem olha a lista precisa
 * enxergar isso sem abrir o cadastro.
 */
function estado(c: Coupon): { texto: string; cor: string } {
  const now = Date.now();
  if (!c.is_active) return { texto: "Inativo", cor: "bg-linen-200 text-linen-600" };
  if (c.starts_at && new Date(c.starts_at).getTime() > now)
    return { texto: "Agendado", cor: "bg-blue-100 text-lilac-600" };
  if (c.ends_at && new Date(c.ends_at).getTime() < now)
    return { texto: "Expirado", cor: "bg-warning/15 text-warning" };
  if (c.max_uses != null && c.used_count >= c.max_uses)
    return { texto: "Esgotado", cor: "bg-warning/15 text-warning" };
  return { texto: "Ativo", cor: "bg-success/15 text-success" };
}

export default async function AdminCouponsPage(
  props: PageProps<"/admin/cupons">,
) {
  const sp = await props.searchParams;
  const busca = (typeof sp.q === "string" ? sp.q : "").trim();
  const coupons = await getCoupons(busca);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink">
          Cupons <span className="text-base font-normal text-linen-500">({coupons.length})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <ListSearch action="/admin/cupons" q={busca} placeholder="Código ou descrição" />
          <Link
            href="/admin/cupons/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700"
          >
            <Plus className="h-4 w-4" /> Novo cupom
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-xs uppercase text-linen-600">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Desconto</th>
              <th className="p-3">Mínimo</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const st = estado(c);
              return (
                <tr key={c.id} className="border-b border-linen-100 last:border-0 hover:bg-linen-100">
                  <td className="p-3">
                    <Link
                      href={`/admin/cupons/${c.id}`}
                      className="font-mono font-medium text-ink hover:text-champagne-700"
                    >
                      {c.code}
                    </Link>
                    {c.description && (
                      <p className="mt-0.5 text-xs text-linen-600">{c.description}</p>
                    )}
                  </td>
                  <td className="p-3 text-linen-600">{descontoLabel(c)}</td>
                  <td className="p-3 text-linen-600">
                    {Number(c.min_subtotal) > 0 ? formatBRL(Number(c.min_subtotal)) : "—"}
                  </td>
                  <td className="p-3 text-linen-600">
                    {c.used_count}
                    {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cor}`}>
                      {st.texto}
                    </span>
                  </td>
                  <td className="p-3">
                    <CouponRowActions id={c.id} isActive={c.is_active} />
                  </td>
                </tr>
              );
            })}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-linen-600">
                  <Ticket className="mx-auto mb-3 h-8 w-8 text-linen-300" />
                  {busca ? "Nenhum cupom com esse termo." : "Nenhum cupom cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
