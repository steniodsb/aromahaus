import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutClient } from "@/components/store/checkout-client";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  // Compra exige conta: sem `user_id` o pedido não aparece em "Meus pedidos"
  // e o cliente fica sem acompanhar o que comprou.
  if (!user) redirect("/conta/login?redirect=/checkout");

  const { data: profile } = await sb
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const account = {
    name: profile?.full_name ?? "",
    email: user.email ?? "",
    phone: "",
  };

  // Parcelamento e frete grátis vêm do `StoreConfigProvider` no layout da loja.
  return <CheckoutClient account={account} />;
}
