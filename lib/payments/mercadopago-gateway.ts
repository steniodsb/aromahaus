import "server-only";
import { createPreference, getPayment as getMpPayment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import type { OrderStatus, PaymentGateway, PaymentSnapshot } from "./types";

/** Status do Mercado Pago → status interno do pedido. */
export function mapMercadoPagoStatus(mp: string | undefined): OrderStatus {
  switch (mp) {
    case "approved":
      return "paid";
    case "in_process":
    case "pending":
      return "pending";
    case "rejected":
    case "cancelled":
      return "canceled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

/**
 * Adaptador do Mercado Pago para o contrato `PaymentGateway`.
 * Apenas embrulha `lib/mercadopago.ts` — a implementação original não mudou.
 */
export const mercadoPagoGateway: PaymentGateway = {
  id: "mercadopago",
  label: "Mercado Pago",
  isConfigured: isMercadoPagoConfigured,

  async createCharge(input) {
    const checkoutUrl = await createPreference({
      orderId: input.orderId,
      items: input.items,
      shippingCost: input.shippingCost,
      payer: { name: input.payer?.name, email: input.payer?.email },
    });
    return { checkoutUrl };
  },

  async getPayment(paymentId): Promise<PaymentSnapshot | null> {
    const payment = await getMpPayment(paymentId);
    if (!payment) return null;
    return {
      status: mapMercadoPagoStatus(payment.status),
      rawStatus: payment.status ?? "",
      paymentId: String(payment.id),
      orderId: payment.external_reference ?? null,
    };
  },
};
