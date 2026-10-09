import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, whatsappLink } from "@/lib/utils";
import { PixPayment, BoletoPayment } from "@/components/store/payment-details";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false },
};

const STATUS: Record<string, { label: string; paid: boolean }> = {
  pending: { label: "Aguardando pagamento", paid: false },
  paid: { label: "Pagamento confirmado", paid: true },
  shipped: { label: "Pedido enviado", paid: true },
  delivered: { label: "Pedido entregue", paid: true },
  canceled: { label: "Pedido cancelado", paid: false },
  refunded: { label: "Pedido reembolsado", paid: false },
};

export default async function OrderConfirmationPage(
  props: PageProps<"/pedido/[id]">,
) {
  const { id } = await props.params;
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (!order) notFound();

  const { data: items } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  const st = STATUS[order.status] ?? STATUS.pending;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-none border border-linen-200 bg-linen-50 p-8 text-center">
        {st.paid ? (
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
        ) : (
          <Clock className="mx-auto mb-4 h-14 w-14 text-yellow-500" />
        )}
        <h1 className="text-2xl font-bold text-ink">Pedido recebido!</h1>
        <p className="mt-1 font-mono text-sm text-linen-600">#{order.id.slice(0, 8)}</p>
        <p className="mt-3 inline-block rounded-full bg-linen-100 px-4 py-1 text-sm font-medium text-ink">
          {st.label}
        </p>

        <div className="mt-6 space-y-2 border-t border-linen-200 pt-6 text-left text-sm">
          {(items ?? []).map((it) => (
            <div key={it.id} className="flex justify-between text-linen-600">
              <span>{it.qty}× {it.name_snapshot}</span>
              <span>{formatBRL(Number(it.unit_price) * it.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between text-linen-600"><span>Frete</span><span>{formatBRL(Number(order.shipping_cost))}</span></div>
          <div className="flex justify-between border-t border-linen-200 pt-2 text-base font-bold text-ink">
            <span>Total</span><span>{formatBRL(Number(order.total))}</span>
          </div>
        </div>

        {order.is_gift ? (
          <p className="mt-5 border-l-2 border-champagne-500 bg-champagne-200/30 px-4 py-3 text-left text-sm text-linen-700">
            Vai embrulhado para presente, com a nota fiscal fora da caixa.
            {order.gift_message
              ? " O cartão sai escrito à mão com a sua mensagem."
              : ""}
          </p>
        ) : null}

        {/* Checkout transparente: QR code do Pix / boleto gerados no pedido */}
        {!st.paid && order.status === "pending" && order.payment_method_kind === "pix" && (
          <PixPayment pix={order.payment_details ?? {}} />
        )}
        {!st.paid && order.status === "pending" && order.payment_method_kind === "boleto" && (
          <BoletoPayment boleto={order.payment_details ?? {}} />
        )}

        {/* Fallback: sem meio de pagamento gerado, combina pelo WhatsApp */}
        {!st.paid && order.status === "pending" && !order.payment_details && (
          <div className="mt-6 bg-linen-100 p-4 text-sm text-linen-600">
            <p className="mb-3">
              Caso ainda não tenha concluído o pagamento, fale com a gente para
              finalizar.
            </p>
            <a
              href={whatsappLink(`Olá! Quero finalizar o pagamento do pedido #${order.id.slice(0, 8)}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Pagar via WhatsApp
            </a>
          </div>
        )}

        <Link href="/produtos" className="mt-8 inline-block text-sm text-champagne-700 hover:underline">
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
