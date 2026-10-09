import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolução de "o que está sendo vendido".
 *
 * Com variantes de tamanho, o preço, o estoque e o peso de um item do carrinho
 * podem vir de duas tabelas diferentes: do produto (sabonete, refil, kit) ou da
 * variante (difusor 250 ml / 500 ml). Todo caminho que cobra, dá baixa ou cota
 * frete passa por aqui — nenhum deles lê `products.price` direto.
 *
 * O que chega do browser é tratado como palpite: o id da variante é conferido
 * contra o produto, e preço e peso são sempre relidos do banco.
 */

export interface SellableRequest {
  /** Id do PRODUTO. */
  id: string;
  /** Id da variante escolhida, quando o produto tem tamanhos. */
  variantId?: string | null;
  qty: number;
}

export interface SellableLine {
  product_id: string;
  variant_id: string | null;
  /** "Difusor de Varetas — Âmbar Haus" */
  name: string;
  /** "500 ml" — null quando o produto não tem tamanhos. */
  variant_label: string | null;
  unit_price: number;
  qty: number;
  weight_g: number | null;
  width_cm: number;
  height_cm: number;
  length_cm: number;
}

/** Medidas de caixa usadas quando o produto não tem dimensão cadastrada. */
const FALLBACK_BOX = { width_cm: 11, height_cm: 22, length_cm: 11, weight_g: 600 };

export async function resolveSellables(
  requested: SellableRequest[],
): Promise<SellableLine[]> {
  if (!requested.length) return [];

  const admin = createAdminClient();
  const productIds = [...new Set(requested.map((i) => i.id))];
  const variantIds = [
    ...new Set(requested.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
  ];

  const [{ data: products }, { data: variants }] = await Promise.all([
    admin
      .from("products")
      .select(
        "id, name, price, item_type, stock, weight_g, width_cm, height_cm, length_cm",
      )
      .in("id", productIds)
      .eq("is_active", true),
    variantIds.length
      ? admin
          .from("product_variants")
          .select(
            "id, product_id, label, price, stock, weight_g, width_cm, height_cm, length_cm",
          )
          .in("id", variantIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const byProduct = new Map((products ?? []).map((p) => [p.id, p]));
  const byVariant = new Map((variants ?? []).map((v) => [v.id, v]));

  const lines: SellableLine[] = [];

  for (const item of requested) {
    const product = byProduct.get(item.id);
    if (!product || product.item_type !== "product") continue;

    const variant = item.variantId ? byVariant.get(item.variantId) : null;
    // Variante que não pertence a este produto é lixo (ou adulteração): o item
    // é descartado em vez de cair no preço do produto, que seria o errado.
    if (item.variantId && (!variant || variant.product_id !== product.id)) continue;

    const stock = Number(variant ? variant.stock : product.stock);
    const qty = Math.max(1, Math.min(item.qty, stock > 0 ? stock : item.qty));

    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };

    const weightRaw = variant?.weight_g ?? product.weight_g;

    lines.push({
      product_id: product.id,
      variant_id: variant?.id ?? null,
      name: product.name,
      variant_label: variant?.label ?? null,
      unit_price: Number(variant ? variant.price : product.price),
      qty,
      weight_g: weightRaw == null ? null : Number(weightRaw),
      width_cm: num(variant?.width_cm ?? product.width_cm, FALLBACK_BOX.width_cm),
      height_cm: num(variant?.height_cm ?? product.height_cm, FALLBACK_BOX.height_cm),
      length_cm: num(variant?.length_cm ?? product.length_cm, FALLBACK_BOX.length_cm),
    });
  }

  return lines;
}

/** Nome completo para a nota e o e-mail: "Difusor — Âmbar Haus (500 ml)". */
export function sellableLabel(line: Pick<SellableLine, "name" | "variant_label">) {
  return line.variant_label ? `${line.name} (${line.variant_label})` : line.name;
}

export const SELLABLE_FALLBACK_BOX = FALLBACK_BOX;
