"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormResult } from "@/lib/admin-form";
import { log } from "@/lib/activity";

/**
 * Promove ou rebaixa um admin.
 *
 * Promover alguém exigia rodar `update profiles set is_admin = true` no SQL
 * editor — ou seja, quem não mexe em banco dependia de quem mexe.
 */
export async function setAdmin(userId: string, isAdmin: boolean): Promise<FormResult> {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  // Ninguém tira o próprio acesso: seria o jeito mais rápido de ficar trancado
  // do lado de fora do painel, sem ninguém para reverter.
  if (userId === user.id && !isAdmin) {
    return { error: "Você não pode remover o seu próprio acesso de admin." };
  }

  if (!isAdmin) {
    // Precisa sobrar alguém. Rebaixar o último admin deixa a loja sem painel.
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true);
    if ((count ?? 0) <= 1) {
      return { error: "Precisa existir pelo menos um admin." };
    }
  }

  const { data: alvo } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await admin
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (error) return { error: error.message };

  void log({
    actorId: user.id,
    actorEmail: user.email,
    action: isAdmin ? "promoveu a admin" : "removeu admin",
    entity: "usuário",
    entityId: userId,
    entityLabel: alvo?.full_name ?? userId.slice(0, 8),
  });

  revalidatePath("/admin/equipe");
  return undefined;
}
