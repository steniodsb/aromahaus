"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { traduzErro, type FormResult } from "@/lib/admin-form";
import { log } from "@/lib/activity";

type Status = "approved" | "rejected" | "pending";

/**
 * Publica, recusa ou devolve uma avaliação para a fila.
 *
 * Recusar não apaga: a avaliação fica guardada como `rejected`. Se alguém
 * reclamar que o comentário sumiu, dá para mostrar o que foi escrito e quando
 * — e dá para voltar atrás sem pedir ao cliente que escreva de novo.
 */
export async function setReviewStatus(id: string, status: Status) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
  if (error) return { error: traduzErro(error.message) };

  void log({
    entity: "avaliação",
    entityId: id,
    action:
      status === "approved" ? "aprovou" : status === "rejected" ? "recusou" : "reabriu",
  });

  revalidatePath("/admin/avaliacoes");
  revalidatePath("/produto/[slug]", "page");
  revalidatePath("/");
  return undefined;
}

/** Resposta pública da loja, assinada pela marca, abaixo da avaliação. */
export async function replyToReview(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  if (!id) return { error: "Avaliação inválida." };

  const { error } = await supabase
    .from("reviews")
    .update({
      reply: reply || null,
      replied_at: reply ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { error: traduzErro(error.message) };

  void log({ entity: "avaliação", entityId: id, action: "respondeu" });

  revalidatePath("/admin/avaliacoes");
  revalidatePath("/produto/[slug]", "page");
  return undefined;
}

/** Remove de vez. Só para spam — o resto se recusa, não se apaga. */
export async function deleteReview(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("reviews").delete().eq("id", id);
  void log({ entity: "avaliação", entityId: id, action: "excluiu" });
  revalidatePath("/admin/avaliacoes");
}
