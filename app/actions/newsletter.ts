"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewsletterWelcomeEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export interface NewsletterResult {
  ok: boolean;
  message: string;
}

/**
 * Captura de e-mail da newsletter.
 *
 * Grava em `newsletter_subscribers` com upsert — uma única ida ao banco, e o
 * unique de `email` resolve a corrida. A versão anterior lia um array JSON
 * inteiro de `settings`, dava push e reescrevia: dois cadastros simultâneos
 * perdiam um, porque o segundo sobrescrevia a leitura do primeiro.
 *
 * `ignoreDuplicates` + `.select()` dá de graça a resposta de "essa inscrição é
 * nova?": em conflito o Postgres não devolve linha nenhuma. É assim que o
 * e-mail de boas-vindas sai só uma vez, sem um SELECT antes (que traria de
 * volta exatamente a corrida que estamos eliminando).
 */
export async function subscribeNewsletter(
  formData: FormData,
): Promise<NewsletterResult> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: "Digite um e-mail válido." };
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("newsletter_subscribers")
      .upsert({ email, source: "loja" }, { onConflict: "email", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error("[newsletter] falha ao inscrever:", error.message);
      return { ok: false, message: "Não foi possível inscrever agora. Tente novamente." };
    }

    // Linha devolvida = inscrição nova. Reenviar a cada submit viraria spam
    // para quem clica duas vezes.
    if (data && data.length > 0) {
      void sendNewsletterWelcomeEmail(email).catch(() => {});
    }

    return { ok: true, message: "Pronto! Você vai receber nossas novidades e ofertas." };
  } catch (err) {
    console.error("[newsletter] erro inesperado:", err);
    return { ok: false, message: "Não foi possível inscrever agora. Tente novamente." };
  }
}
