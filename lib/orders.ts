import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vincula à conta os pedidos feitos como convidado com o mesmo e-mail.
 *
 * Quem compra sem estar logado (ou cria a conta depois) fica com o pedido
 * gravado sem `user_id`, e "Meus pedidos" — que filtra por `user_id` — nunca
 * mostra a compra. Roda no acesso à conta e é idempotente.
 *
 * Exige e-mail confirmado: sem isso bastaria criar uma conta com o e-mail de
 * outra pessoa para ler os pedidos dela (nome, endereço, itens). Depende de
 * "Confirm email" ligado no Supabase → Authentication → Sign In / Providers.
 *
 * Usa a service role porque a RLS de `orders` só enxerga o que já é do
 * usuário — o pedido órfão, por definição, ainda não é.
 */
export async function claimGuestOrders(user: {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
}): Promise<number> {
  const email = user.email?.trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return 0;

  // `%` e `_` são curingas do ILIKE: sem escapar, um e-mail com underscore
  // ("joao_silva@…") casaria com o de outra pessoa.
  const pattern = email.replace(/([%_\\])/g, "\\$1");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ user_id: user.id })
    .is("user_id", null)
    .ilike("customer_email", pattern)
    .select("id");

  if (error) {
    console.error("[claim-guest-orders]", error);
    return 0;
  }
  return data?.length ?? 0;
}
