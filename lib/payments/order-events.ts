import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderPaidEmail, sendAdminNewOrderEmail, sendAdminLowStockEmail } from "@/lib/email";
import type { PaymentSnapshot } from "./types";

/** Abaixo disto o lojista é avisado para repor. */
const LOW_STOCK_THRESHOLD = 3;

/**
 * Avisa o lojista se a venda deixou algum produto com estoque baixo.
 *
 * Roda depois do `decrement_order_stock`, então lê o estoque já atualizado, e
 * só olha os produtos deste pedido — varrer o catálogo inteiro mandaria o
 * mesmo alerta a cada venda para itens que já estavam baixos há semanas.
 */
async function notifyLowStock(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<void> {
  const { data: items } = await admin
    .from("order_items")
    .select("product_id")
    .eq("order_id", orderId);

  const ids = [...new Set((items ?? []).map((i) => i.product_id).filter(Boolean))];
  if (!ids.length) return;

  const { data: products } = await admin
    .from("products")
    .select("name, stock")
    .in("id", ids)
    .lte("stock", LOW_STOCK_THRESHOLD);

  if (products?.length) await sendAdminLowStockEmail(products);
}

/**
 * Aplica o resultado de um pagamento ao pedido: atualiza o status e dispara os
 * efeitos colaterais (baixa/devolução de estoque e e-mails).
 *
 * Compartilhado por todos os gateways (Mercado Pago, C6, …) para que a regra de
 * negócio viva num lugar só. Todos os efeitos são idempotentes:
 * - `decrement_order_stock` / `restore_order_stock` só rodam uma vez por pedido (RPC no banco);
 * - os e-mails são guardados pela flag `paid_email_sent`.
 *
 * Nunca lança — webhooks devem responder 200 mesmo em falha parcial, senão o
 * gateway fica reenviando a notificação indefinidamente.
 */
export async function applyPaymentSnapshot(snapshot: PaymentSnapshot): Promise<void> {
  const { orderId, status, rawStatus, paymentId } = snapshot;
  if (!orderId) return;

  const admin = createAdminClient();

  await admin
    .from("orders")
    .update({
      status,
      payment_id: paymentId,
      payment_status: rawStatus,
    })
    .eq("id", orderId);

  if (status === "paid") {
    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (order) {
      // Baixa de estoque — a função no banco só roda uma vez por pedido
      await admin.rpc("decrement_order_stock", { p_order_id: orderId });

      // E-mails de confirmação (uma única vez)
      if (!order.paid_email_sent) {
        const { data: items } = await admin
          .from("order_items")
          .select("name_snapshot, unit_price, qty")
          .eq("order_id", orderId);

        await sendOrderPaidEmail(order, items ?? []).catch(() => {});
        await sendAdminNewOrderEmail(order).catch(() => {});
        await notifyLowStock(admin, orderId).catch(() => {});
        await admin
          .from("orders")
          .update({ paid_email_sent: true, last_status_emailed: "paid" })
          .eq("id", orderId);
      }
    }
  }

  // Devolve estoque se o pedido foi cancelado/reembolsado depois de pago
  if (status === "canceled" || status === "refunded") {
    await admin.rpc("restore_order_stock", { p_order_id: orderId });
  }
}
