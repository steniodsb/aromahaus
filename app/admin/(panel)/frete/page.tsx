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
    return { texto: "Agendada", cor: "bg-champagne-200 text-champagne-700" };
  if (r.ends_at && new Date(r.ends_at).getTime() < now)
    return { texto: "Expirada", cor: "bg-warning/15 text-warning" };
  return { texto: "Ativa", cor: "bg-success/15 text-success" };
}

export default async function AdminShippingRulesPage() {
  const [rules, origin] = await Promise.all([getRules(), getShippingOrigin()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">
            Regras de frete{" "}
            <span className="numeral text-base text-linen-500">({rules.length})</span>
          </h1>
          <p className="mt-1 text-sm text-linen-600">
            Frete grátis, valor fixo ou desconto por região, peso e período. Use para incentivar kits e pedidos maiores sem mexer no frete de todo mundo.
          </p>
        </div>
        <Link
          href="/admin/frete/nova"
          className="inline-flex items-center gap-2 rounded bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700"
        >
          <Plus className="h-4 w-4" /> Nova regra
        </Link>
      </div>

      <div className="mb-6 rounded border border-linen-200 bg-linen-50 p-5">
        <h2 className="font-display text-lg text-ink">Frete grátis geral</h2>
        <p className="mt-1 text-sm text-linen-600">
          {Number(origin.free_shipping_threshold) > 0 ? (
            <>
              Hoje todo pedido acima de{" "}
              <strong className="numeral">{formatBRL(Number(origin.free_shipping_threshold))}</strong> sai
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
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-[0.6875rem] uppercase tracking-[0.12em] text-linen-600">
            <tr>
              <th className="p-3">Regra</th>
              <th className="p-3">Efeito</th>
              <th className="p-3">Condições</th>
              <th className="p-3">Prior.</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linen-200">
            {rules.map((r) => {
              const st = estado(r);
              return (
                <tr key={r.id} className="hover:bg-linen-100">
                  <td className="p-3">
                    <Link
                      href={`/admin/frete/${r.id}`}
                      className="text-ink hover:text-champagne-700"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="numeral p-3 text-linen-600">{efeito(r)}</td>
                  <td className="numeral p-3 text-xs text-linen-600">{condicoes(r)}</td>
                  <td className="numeral p-3 text-linen-600">{r.priority}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] ${st.cor}`}>
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
                <td colSpan={6} className="p-10 text-center text-sm text-linen-600">
                  <Truck className="mx-auto mb-3 h-8 w-8 text-linen-300" />
                  Nenhuma regra promocional de frete. Crie uma em Nova regra, por exemplo frete grátis para o Sudeste em pedidos acima de determinado valor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
