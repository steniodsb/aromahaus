"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reconferência do carrinho contra o banco.
 *
 * O carrinho vive no `localStorage` com uma FOTO do produto: preço, nome e
 * estoque do momento em que o cliente clicou. Essa foto nunca envelhecia. O
 * resultado era o pior tipo de erro numa loja — o cliente via R$ 129 (preço
 * da promoção da semana passada, ainda no storage dele) e o checkout, que lê
 * preço do banco, cobrava R$ 169. Ninguém mentiu para ninguém e o cliente
 * abre reclamação, com razão.
 *
 * Esta action não decide nada: devolve o estado atual de cada linha e deixa a
 * UI avisar. É pública de propósito — não há nada aqui que o cliente já não
 * veja na página do produto, e o carrinho de quem não tem conta precisa
 * funcionar.
 */

export interface LinhaCarrinhoAtual {
  /** A chave do carrinho: id da variante quando há, do produto quando não. */
  id: string;
  /** `null` quando o produto saiu do ar, a variante foi apagada ou esgotou. */
  atual: {
    name: string;
    slug: string;
    price: number;
    stock: number;
    image: string | null;
    variantLabel: string | null;
  } | null;
}

export async function revalidarCarrinho(
  pedido: { id: string; productId: string; variantId: string | null }[],
): Promise<LinhaCarrinhoAtual[]> {
  if (!pedido.length) return [];

  // Teto defensivo: é endpoint público e o corpo vem do browser.
  const itens = pedido.slice(0, 60);

  const admin = createAdminClient();
  const productIds = [...new Set(itens.map((i) => i.productId).filter(Boolean))];
  const variantIds = [
    ...new Set(itens.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
  ];

  const [{ data: produtos }, { data: variantes }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, slug, price, stock, images, item_type, is_active")
      .in("id", productIds)
      .eq("is_active", true),
    variantIds.length
      ? admin
          .from("product_variants")
          .select("id, product_id, label, price, stock, is_active")
          .in("id", variantIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const porProduto = new Map((produtos ?? []).map((p) => [p.id, p]));
  const porVariante = new Map((variantes ?? []).map((v) => [v.id, v]));

  return itens.map((item) => {
    const produto = porProduto.get(item.productId);
    if (!produto || produto.item_type !== "product") return { id: item.id, atual: null };

    const variante = item.variantId ? porVariante.get(item.variantId) : null;
    if (item.variantId && (!variante || variante.product_id !== produto.id)) {
      return { id: item.id, atual: null };
    }

    const stock = Number(variante ? variante.stock : produto.stock);
    if (!Number.isFinite(stock) || stock <= 0) return { id: item.id, atual: null };

    const imagens = (produto.images as string[] | null) ?? [];

    return {
      id: item.id,
      atual: {
        name: produto.name as string,
        slug: produto.slug as string,
        price: Number(variante ? variante.price : produto.price),
        stock,
        image: imagens[0] ?? null,
        variantLabel: (variante?.label as string | undefined) ?? null,
      },
    };
  });
}
