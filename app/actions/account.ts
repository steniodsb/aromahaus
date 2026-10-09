"use server";

import { sendWelcomeEmail } from "@/lib/email";

/**
 * Dispara o e-mail de boas-vindas depois do cadastro.
 *
 * Existe como server action porque o cadastro roda no browser
 * (`supabase.auth.signUp`) e a chave do Resend é server-only.
 *
 * Só deve ser chamada quando a conta já nasce ativa (com sessão). Se a
 * confirmação de e-mail estiver ligada no Supabase, quem manda o primeiro
 * e-mail é ele — dizer "sua conta está pronta" antes da confirmação seria
 * mentira e ainda concorreria com o e-mail de confirmação na caixa de entrada.
 */
export async function notifyWelcome(user: { name?: string | null; email: string }) {
  if (!user?.email) return;
  await sendWelcomeEmail(user).catch(() => {});
}
