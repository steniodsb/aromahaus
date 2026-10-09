import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShippingRule } from "@/lib/types";

/**
 * Regras promocionais de frete.
 *
 * Rodam DEPOIS da cotação do Melhor Envio: a transportadora e o prazo
 * continuam sendo os reais, a regra só altera o preço cobrado do cliente. A
 * diferença sai do bolso da loja — a etiqueta ainda custa o valor cheio.
 *
 * Só UMA regra se aplica por pedido (a de maior `priority`), de propósito:
 * empilhar duas promoções de frete é o tipo de coisa que ninguém consegue
 * prever ao cadastrar a segunda.
 */

export interface ShippingRuleContext {
  subtotal: number;
  shippingCost: number;
  /** UF de entrega, ex.: "SP". */
  state: string | null;
  /** Peso total do carrinho em gramas, se conhecido. */
  weightG: number | null;
  /**
   * true quando o cliente escolheu uma opção que não é a mais barata.
   *
   * Só importa para regras de frete grátis: elas prometem entregar sem custo,
   * não entregar no modo mais caro sem custo.
   */
  isUpgrade?: boolean;
}

export interface ShippingRuleResult {
  /** Preço do frete depois da regra. */
  price: number;
  /** Regra aplicada, ou null se nenhuma bateu. */
  rule: ShippingRule | null;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Aplica uma regra já escolhida a um valor de frete. */
export function priceWithRule(rule: ShippingRule, shippingCost: number): number {
  switch (rule.kind) {
    case "free":
      return 0;
    case "fixed":
      // Nunca cobra mais do que o frete real custaria — uma regra de "frete fixo
      // R$ 20" não pode encarecer um frete que saiu por R$ 12.
      return round2(Math.min(Number(rule.value), shippingCost));
    case "percent_off":
      return round2(Math.max(0, shippingCost * (1 - Number(rule.value) / 100)));
  }
}

/** True se a regra vale para este carrinho. */
export function ruleMatches(rule: ShippingRule, ctx: ShippingRuleContext, now = Date.now()) {
  if (!rule.is_active) return false;

  // Frete grátis promocional cobre a opção de prazo padrão, igual ao frete
  // grátis por valor de compra. Sem isto, quem batesse a regra podia escolher
  // a transportadora mais cara e a loja bancava a diferença sem saber — foi
  // exatamente o que apareceu no teste: upgrade de R$ 77,33 saindo por R$ 0.
  // Descontos proporcionais (percent_off / fixed) continuam valendo em
  // qualquer opção: ali a loja escolheu um desconto, não uma isenção.
  if (rule.kind === "free" && ctx.isUpgrade) return false;

  if (rule.starts_at && new Date(rule.starts_at).getTime() > now) return false;
  if (rule.ends_at && new Date(rule.ends_at).getTime() < now) return false;
  if (ctx.subtotal < Number(rule.min_subtotal)) return false;

  // Peso desconhecido não pode passar por uma regra que limita peso — senão a
  // loja daria frete grátis para uma caixa de 30kg sem perceber.
  if (rule.max_weight_g != null) {
    if (ctx.weightG == null) return false;
    if (ctx.weightG > rule.max_weight_g) return false;
  }

  if (rule.states.length > 0) {
    const uf = ctx.state?.trim().toUpperCase();
    if (!uf || !rule.states.includes(uf)) return false;
  }

  return true;
}

/**
 * Escolhe a melhor regra e devolve o frete final.
 *
 * `shippingCost` de 0 sai como 0 e sem regra — não há o que descontar, e
 * marcar uma regra como "aplicada" aí só confundiria o pedido.
 */
export async function applyShippingRules(
  ctx: ShippingRuleContext,
): Promise<ShippingRuleResult> {
  if (ctx.shippingCost <= 0) return { price: 0, rule: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shipping_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[frete] não consegui ler as regras de frete:", error.message);
    return { price: ctx.shippingCost, rule: null };
  }

  const now = Date.now();
  const rule = ((data as ShippingRule[]) ?? []).find((r) => ruleMatches(r, ctx, now));
  if (!rule) return { price: ctx.shippingCost, rule: null };

  return { price: priceWithRule(rule, ctx.shippingCost), rule };
}
