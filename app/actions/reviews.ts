"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ReviewResult {
  ok: boolean;
  message: string;
  needsAuth?: boolean;
}

const BODY_MAX = 1500;

/**
 * Recebe a avaliação de um cliente.
 *
 * Três decisões que valem explicar:
 *
 *  1. Exige conta. Sem isso, a página de um produto vira caixa de entrada
 *     aberta — e a média de notas, algo que qualquer um escreve de fora.
 *  2. Nasce `pending`. Perfumaria vende para a casa das pessoas; um comentário
 *     ofensivo publicado na hora custa mais caro que a espera da moderação.
 *  3. `verified_purchase` é calculado aqui, no servidor, a partir dos pedidos
 *     pagos do próprio cliente. O browser não tem como pedir esse selo.
 */
export async function submitReview(formData: FormData): Promise<ReviewResult> {
  const productId = String(formData.get("product_id") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!productId) return { ok: false, message: "Produto inválido." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Escolha uma nota de 1 a 5 estrelas." };
  }
  if (body.length < 10) {
    return { ok: false, message: "Escreva pelo menos uma frase sobre a fragrância." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      needsAuth: true,
      message: "Entre na sua conta para avaliar.",
    };
  }

  const admin = createAdminClient();

  // Comprou de verdade? Procura um pedido pago deste cliente com este produto.
  const { data: bought } = await admin
    .from("order_items")
    .select("order_id, orders!inner(user_id, status)")
    .eq("product_id", productId)
    .eq("orders.user_id", user.id)
    .in("orders.status", ["paid", "shipped", "delivered"])
    .limit(1);

  const verified = Boolean(bought?.length);
  const orderId = (bought?.[0]?.order_id as string | undefined) ?? null;

  const name =
    String(formData.get("author_name") ?? "").trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Cliente";

  const registro = {
    product_id: productId,
    user_id: user.id,
    order_id: orderId,
    author_name: name.slice(0, 60),
    rating,
    title: title.slice(0, 120) || null,
    body: body.slice(0, BODY_MAX),
    verified_purchase: verified,
    status: "pending" as const,
  };

  // Quem avalia de novo CORRIGE o que escreveu, em vez de empilhar duas notas
  // e distorcer a média do produto.
  //
  // Isto era um `upsert` com `onConflict: "user_id,product_id"`, e nunca
  // funcionou: o índice único da 0010 era parcial (`where user_id is not
  // null`), e o Postgres só infere índice parcial se o ON CONFLICT repetir o
  // predicado — coisa que o PostgREST não faz. Toda avaliação morria em
  // `42P10` e o cliente lia "Não foi possível enviar agora".
  //
  // A 0013 troca o índice por um total, mas este caminho não depende disso:
  // procura antes e decide. Funciona com a migração aplicada ou não.
  const { data: existente } = await admin
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  const { error } = existente
    ? await admin.from("reviews").update(registro).eq("id", existente.id)
    : await admin.from("reviews").insert(registro);

  if (error) {
    console.error("[avaliação] não consegui gravar:", error.message);
    return { ok: false, message: "Não foi possível enviar agora. Tente de novo." };
  }

  revalidatePath("/produto/[slug]", "page");

  return {
    ok: true,
    message: existente
      ? "Sua avaliação foi atualizada e volta para a moderação."
      : "Obrigado! Sua avaliação foi enviada e aparece assim que passar pela moderação.",
  };
}
