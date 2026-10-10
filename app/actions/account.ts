"use server";

import { sendWelcomeEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

/**
 * Dispara o e-mail de boas-vindas depois do cadastro.
 *
 * Existe como server action porque o cadastro roda no browser
 * (`supabase.auth.signUp`) e a chave do Resend é server-only.
 *
 * NÃO recebe parâmetro — e isso é o ponto. Server action é endpoint HTTP
 * público: a versão anterior aceitava `{ name, email }` do corpo da
 * requisição e mandava o e-mail para onde pedissem, com o nome que
 * pedissem. Virava relay de spam assinado pelo domínio da loja, com o
 * logo da marca e o nome do destinatário no corpo — exatamente o que o
 * Resend considera abuso e o motivo pelo qual um domínio é suspenso.
 *
 * O destinatário sai da sessão. Sem sessão, não há e-mail: só é chamada
 * logo depois de um cadastro que já nasceu ativo (`data.session`).
 *
 * Se a confirmação de e-mail estiver ligada no Supabase, quem manda o
 * primeiro e-mail é ele — dizer "sua conta está pronta" antes da
 * confirmação seria mentira e ainda concorreria com o e-mail de
 * confirmação na caixa de entrada.
 */
export async function notifyWelcome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  // Conta que exige confirmação não recebe "sua conta está pronta".
  if (!user.email_confirmed_at && !user.confirmed_at) return;

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  await sendWelcomeEmail({ name, email: user.email }).catch(() => {});
}
