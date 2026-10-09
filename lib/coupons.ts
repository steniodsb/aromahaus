import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Coupon } from "@/lib/types";

/**
 * Validação e cálculo de cupom.
 *
 * Tudo aqui é servidor, sem exceção. A tabela `coupons` não tem policy de
 * leitura pública justamente para o browser nunca conseguir listar os códigos
 * ativos; a única porta é esta, e ela sempre recalcula do zero. Nada do que o
 * cliente manda (valor do desconto, subtotal) é aceito como verdade.
 */

export interface CouponContext {
  subtotal: number;
  shippingCost: number;
  email: string | null;
  userId: string | null;
}

export interface AppliedCoupon {
  coupon: Coupon;
  /** Desconto sobre os produtos, já limitado ao subtotal. */
  discount: number;
  /** true quando o cupom zera o frete. */
  freeShipping: boolean;
}

export type CouponResult =
  | { ok: true; applied: AppliedCoupon }
  | { ok: false; error: string };

/** Normaliza para o mesmo formato do índice unique da tabela. */
export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

/**
 * Escapa os curingas de LIKE (`%`, `_`) e a própria barra de escape.
 *
 * ⚠️ Obrigatório em TODO valor que vai para `.ilike()`. Sem isso o texto que o
 * cliente digita é interpretado como padrão: digitar `%` sozinho casa com o
 * PRIMEIRO cupom da tabela, e qualquer um sacaria um desconto sem conhecer
 * nenhum código. O mesmo vale para o e-mail nos limites por cliente — `_` e
 * `%` são comuns o bastante em endereço de e-mail para o limite furar sozinho.
 *
 * Usamos `ilike` (e não `eq`) só pela insensibilidade a maiúsculas; escapado,
 * ele se comporta como igualdade case-insensitive, que é a intenção.
 */
function likeEscape(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Quanto este cupom vale, dado o carrinho.
 *
 * Exportada porque o admin também usa para pré-visualizar, e porque o
 * `createCheckout` precisa recalcular no momento da compra — o carrinho pode
 * ter mudado entre o "aplicar cupom" e o "finalizar".
 */
export function computeDiscount(
  coupon: Coupon,
  subtotal: number,
  shippingCost: number,
): { discount: number; freeShipping: boolean } {
  if (coupon.type === "free_shipping") {
    return { discount: 0, freeShipping: shippingCost > 0 };
  }

  const raw =
    coupon.type === "percent"
      ? (subtotal * Number(coupon.value)) / 100
      : Number(coupon.value);

  const capped =
    coupon.max_discount != null ? Math.min(raw, Number(coupon.max_discount)) : raw;

  // Nunca deixa o desconto passar do subtotal: o frete não é "pago" com cupom
  // de produto, e um total negativo quebraria o pagamento.
  return { discount: round2(Math.max(0, Math.min(capped, subtotal))), freeShipping: false };
}

/**
 * Valida um código para um carrinho específico.
 *
 * Devolve mensagem em PT-BR pronta para o cliente — sem vazar detalhe interno
 * (não diz "esse cupom é só para primeira compra de outro e-mail", por exemplo).
 */
export async function validateCoupon(
  code: string,
  ctx: CouponContext,
): Promise<CouponResult> {
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, error: "Informe um cupom." };

  const admin = createAdminClient();

  // `upper(btrim(code))` é exatamente a expressão do índice unique.
  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .ilike("code", likeEscape(normalized))
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Cupom inválido." };
  const coupon = data as Coupon;

  if (!coupon.is_active) return { ok: false, error: "Cupom inválido." };

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { ok: false, error: "Este cupom ainda não está valendo." };
  }
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) {
    return { ok: false, error: "Este cupom expirou." };
  }

  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { ok: false, error: "Este cupom já atingiu o limite de usos." };
  }

  if (ctx.subtotal < Number(coupon.min_subtotal)) {
    const falta = Number(coupon.min_subtotal) - ctx.subtotal;
    return {
      ok: false,
      error: `Este cupom vale a partir de R$ ${Number(coupon.min_subtotal).toFixed(2).replace(".", ",")} em produtos (faltam R$ ${falta.toFixed(2).replace(".", ",")}).`,
    };
  }

  // Limites por cliente. Sem e-mail não dá para checar — e um cupom com limite
  // por pessoa sem saber quem é a pessoa não pode ser liberado.
  const email = ctx.email?.trim().toLowerCase() || null;

  if (coupon.first_order_only || coupon.max_uses_per_customer != null) {
    if (!email) return { ok: false, error: "Informe seu e-mail para usar este cupom." };

    if (coupon.first_order_only) {
      const { count } = await admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .ilike("customer_email", likeEscape(email))
        .neq("status", "cancelled");
      if ((count ?? 0) > 0) {
        return { ok: false, error: "Este cupom é válido só na primeira compra." };
      }
    }

    if (coupon.max_uses_per_customer != null) {
      const { count } = await admin
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .ilike("customer_email", likeEscape(email));
      if ((count ?? 0) >= coupon.max_uses_per_customer) {
        return { ok: false, error: "Você já usou este cupom." };
      }
    }
  }

  const { discount, freeShipping } = computeDiscount(coupon, ctx.subtotal, ctx.shippingCost);

  if (coupon.type === "free_shipping" && !freeShipping) {
    return { ok: false, error: "Calcule o frete antes de aplicar este cupom." };
  }
  if (coupon.type !== "free_shipping" && discount <= 0) {
    return { ok: false, error: "Este cupom não gera desconto neste carrinho." };
  }

  return { ok: true, applied: { coupon, discount, freeShipping } };
}

/**
 * Registra o uso do cupom no pedido.
 *
 * O `used_count` é atualizado pelo trigger `trg_redemptions_count`, então aqui
 * só inserimos. Falha em silêncio de propósito: o pedido já foi criado e já
 * pode ter sido cobrado — derrubar o checkout por causa da contabilidade do
 * cupom seria trocar um problema pequeno por um grande. O erro vai para o log.
 */
export async function redeemCoupon(args: {
  couponId: string;
  orderId: string;
  userId: string | null;
  email: string | null;
  amount: number;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("coupon_redemptions").insert({
    coupon_id: args.couponId,
    order_id: args.orderId,
    user_id: args.userId,
    customer_email: args.email,
    amount: args.amount,
  });
  if (error) {
    console.error(
      `[cupom] não consegui registrar o resgate do cupom ${args.couponId} no pedido ${args.orderId}:`,
      error.message,
    );
  }
}
