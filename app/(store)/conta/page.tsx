import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { claimGuestOrders } from "@/lib/orders";
import { formatBRL } from "@/lib/utils";
import { LogoutButton } from "@/components/site/logout-button";
import { dataBR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/conta/login");

  // Antes de listar: puxa para a conta o que foi comprado como convidado com
  // este mesmo e-mail, senão a compra existe mas nunca aparece aqui.
  await claimGuestOrders(user);

  const [{ data: profile }, { data: orders, error: ordersErr }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("orders")
      .select("id,total,status,created_at,tracking_code")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (ordersErr) console.error("[conta] pedidos", ordersErr);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow">Minha conta</p>
          <h1 className="font-display mt-3 text-3xl text-ink">
            Olá, {profile?.full_name || user.email}
          </h1>
        </div>
        <LogoutButton />
      </div>

      <nav className="mb-10 flex flex-wrap gap-2.5 border-b border-line pb-6">
        <Link
          href="/conta/favoritos"
          className="inline-flex items-center gap-2 border border-line px-5 py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
        >
          <Heart className="h-3.5 w-3.5" strokeWidth={1.5} /> Lista de desejos
        </Link>
        <Link
          href="/rastreio"
          className="inline-flex items-center gap-2 border border-line px-5 py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
        >
          <Package className="h-3.5 w-3.5" strokeWidth={1.5} /> Rastrear pedido
        </Link>
      </nav>

      <h2 className="eyebrow mb-5">Meus pedidos</h2>

      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/pedido/${o.id}`}
              className="flex items-center justify-between border border-linen-200 bg-linen-50 p-4 transition-shadow hover:shadow-md"
            >
              <div>
                <span className="font-mono text-sm text-champagne-700">#{o.id.slice(0, 8)}</span>
                <p className="text-xs text-linen-600">
                  {dataBR(o.created_at)}
                  {o.tracking_code ? ` · Rastreio: ${o.tracking_code}` : ""}
                </p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-ink">{formatBRL(Number(o.total))}</span>
                <span className="text-xs text-linen-600">{STATUS_LABEL[o.status] ?? o.status}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : ordersErr ? (
        <div className="rounded-none border border-dashed border-linen-300 p-8 text-center text-linen-600">
          Não foi possível carregar seus pedidos agora. Recarregue a página em
          instantes.
        </div>
      ) : (
        <div className="rounded-none border border-dashed border-linen-300 p-8 text-center text-linen-600">
          <p>
            Você ainda não fez pedidos.{" "}
            <Link href="/produtos" className="text-champagne-700 hover:underline">
              Ver produtos
            </Link>
          </p>
          <p className="mt-2 text-xs">
            Comprou como visitante? O pedido aparece aqui quando a compra foi
            feita com este mesmo e-mail ({user.email}).
          </p>
        </div>
      )}
    </div>
  );
}
