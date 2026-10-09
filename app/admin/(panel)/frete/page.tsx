import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getShippingOrigin } from "@/lib/store";
import { formatBRL } from "@/lib/utils";
import type { ShippingRule } from "@/lib/types";
import { ShippingRuleRowActions } from "@/components/admin/shipping-rule-row-actions";

async function getRules(): Promise<ShippingRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipping_rules")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as ShippingRule[]) ?? [];
}

function efeito(r: ShippingRule) {
  if (r.kind === "free") return "Frete grátis";
  if (r.kind === "fixed") return `Frete fixo ${formatBRL(Number(r.value))}`;
  return `${Number(r.value)}% de desconto no frete`;
}

function condicoes(r: ShippingRule) {
  const partes: string[] = [];
  if (Number(r.min_subtotal) > 0) partes.push(`a partir de ${formatBRL(Number(r.min_subtotal))}`);
  if (r.max_weight_g != null) partes.push(`até ${r.max_weight_g} g`);
  partes.push(r.states.length ? r.states.join(", ") : "Brasil todo");
  return partes.join(" · ");
}

function estado(r: ShippingRule): { texto: string; cor: string } {
  const now = Date.now();
  if (!r.is_active) return { texto: "Inativa", cor: "bg-linen-200 text-linen-600" };
  if (r.starts_at && new Date(r.starts_at).getTime() > now)
    return { texto: "Agendada", cor: "bg-blue-100 text-lilac-600" };
  if (r.ends_at && new Date(r.ends_at).getTime() < now)
    return { texto: "Expirada", cor: "bg-warning/15 text-warning" };
  return { texto: "Ativa", cor: "bg-success/15 text-success" };
}

export default async function AdminShippingRulesPage() {
  const [rules, origin] = await Promise.all([getRules(), getShippingOrigin()]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">
          Regras de frete{" "}
          <span className="text-base font-normal text-linen-500">({rules.length})</span>
        </h1>
        <Link
          href="/admin/frete/nova"
          className="inline-flex items-center gap-2 rounded-lg bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700"
        >
          <Plus className="h-4 w-4" /> Nova regra
        </Link>
      </div>

      <div className="mb-6 rounded border border-linen-200 bg-linen-50 p-5">
        <h2 className="font-semibold text-ink">Frete grátis geral</h2>
        <p className="mt-1 text-sm text-linen-600">
          {Number(origin.free_shipping_threshold) > 0 ? (
            <>
              Hoje todo pedido acima de{" "}
              <strong>{formatBRL(Number(origin.free_shipping_threshold))}</strong> sai
              com frete grátis, em qualquer estado. Isso vem antes das regras
              abaixo.
            </>
          ) : (
            <>
              Desligado. Para um frete grátis simples por valor, use{" "}
              <Link href="/admin/config" className="text-champagne-700 hover:underline">
                Configurações → Frete
              </Link>
              . As regras abaixo servem para casos mais específicos (região,
              peso, período).
            </>
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-xs uppercase text-linen-600">
            <tr>
              <th className="p-3">Regra</th>
              <th className="p-3">Efeito</th>
              <th className="p-3">Condições</th>
              <th className="p-3">Prior.</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const st = estado(r);
              return (
                <tr key={r.id} className="border-b border-linen-100 last:border-0 hover:bg-linen-100">
                  <td className="p-3">
                    <Link
                      href={`/admin/frete/${r.id}`}
                      className="font-medium text-ink hover:text-champagne-700"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="p-3 text-linen-600">{efeito(r)}</td>
                  <td className="p-3 text-xs text-linen-600">{condicoes(r)}</td>
                  <td className="p-3 text-linen-600">{r.priority}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cor}`}>
                      {st.texto}
                    </span>
                  </td>
                  <td className="p-3">
                    <ShippingRuleRowActions id={r.id} isActive={r.is_active} />
                  </td>
                </tr>
              );
            })}
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-linen-600">
                  <Truck className="mx-auto mb-3 h-8 w-8 text-linen-300" />
                  Nenhuma regra promocional de frete.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
