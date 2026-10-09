"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { traduzErro, type FormResult } from "@/lib/admin-form";

/**
 * Salva uma página institucional.
 *
 * Faz `upsert` por slug: se a migração 0007 rodou, a linha já existe e é
 * atualizada; se alguém apagou, é recriada. O slug nunca vem do formulário —
 * ele define a URL pública e é escolhido pela lista fechada abaixo.
 */
const SLUGS = ["termos-de-uso", "trocas-e-devolucoes", "politica-de-privacidade"];

export async function savePage(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const slug = String(formData.get("slug") ?? "");
  if (!SLUGS.includes(slug)) return { error: "Página desconhecida." };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "O título é obrigatório." };

  const { error } = await supabase.from("pages").upsert(
    {
      slug,
      title,
      content: (formData.get("content") as string) ?? "",
      seo_title: ((formData.get("seo_title") as string) || "").trim() || null,
      seo_description: ((formData.get("seo_description") as string) || "").trim() || null,
      is_active: true,
    },
    { onConflict: "slug" },
  );

  if (error) return { error: traduzErro(error.message) };

  revalidatePath("/admin/paginas");
  revalidatePath(`/${slug}`);
  return undefined;
}

/** Salva o FAQ inteiro de uma vez — a ordem importa e é mais simples reescrever. */
export async function saveFaq(
  itens: { question: string; answer: string }[],
): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const limpos = itens
    .map((i) => ({ question: i.question?.trim(), answer: i.answer?.trim() }))
    .filter((i) => i.question && i.answer);

  // Substituição completa: apaga e reinsere na ordem da tela. Como são poucos
  // itens e nada referencia a linha, é mais previsível do que fazer diff.
  const { error: delErr } = await supabase
    .from("faq_items")
    .delete()
    .not("id", "is", null);
  if (delErr) return { error: traduzErro(delErr.message) };

  if (limpos.length) {
    const { error } = await supabase.from("faq_items").insert(
      limpos.map((i, idx) => ({
        question: i.question!,
        answer: i.answer!,
        position: idx + 1,
        is_active: true,
      })),
    );
    if (error) return { error: traduzErro(error.message) };
  }

  revalidatePath("/admin/paginas");
  revalidatePath("/faq");
  return undefined;
}
