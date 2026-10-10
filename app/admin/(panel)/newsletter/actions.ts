"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { traduzErro, type FormResult } from "@/lib/admin-form";

/**
 * Descadastra ou reinscreve. Não apaga — o histórico de quem pediu para sair
 * é justamente o que impede a loja de reenviar para essa pessoa depois.
 */
export async function setSubscriberStatus(
  id: string,
  status: "subscribed" | "unsubscribed",
): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();
  // `unsubscribed_at` é carimbado pelo trigger da migração 0006.
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ status })
    .eq("id", id);
  if (error) return { error: traduzErro(error.message) };
  revalidatePath("/admin/newsletter");
  return undefined;
}

/** Remoção definitiva — para pedido de exclusão de dados (LGPD). */
export async function deleteSubscriber(id: string): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
  if (error) return { error: traduzErro(error.message) };
  revalidatePath("/admin/newsletter");
  return undefined;
}
