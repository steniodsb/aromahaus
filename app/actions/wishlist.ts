"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface WishlistResult {
  ok: boolean;
  /** Estado DEPOIS da ação, para o botão não precisar adivinhar. */
  saved?: boolean;
  /** Preenchido quando o visitante ainda não entrou. */
  needsAuth?: boolean;
  error?: string;
}

/**
 * Liga/desliga um produto na lista de desejos do cliente logado.
 *
 * A lista é por usuário e vive no banco (não no browser) de propósito: o
 * cliente favorita no celular e espera encontrar no computador. Quem não está
 * logado recebe `needsAuth` — o botão manda para o login levando o endereço de
 * volta, em vez de engolir o clique em silêncio.
 */
export async function toggleWishlist(productId: string): Promise<WishlistResult> {
  if (!productId) return { ok: false, error: "Produto inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, needsAuth: true };

  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
    if (error) return { ok: false, error: "Não foi possível remover agora." };
    revalidatePath("/conta/favoritos");
    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("wishlist_items")
    .insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, error: "Não foi possível salvar agora." };

  revalidatePath("/conta/favoritos");
  return { ok: true, saved: true };
}
