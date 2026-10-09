import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;
  return new MercadoPagoConfig({ accessToken });
}

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

/**
 * Cria uma preferência de pagamento no Mercado Pago.
 * Retorna a URL de checkout (init_point) ou null se não configurado / erro.
 */
export async function createPreference(params: {
  orderId: string;
  items: PreferenceItem[];
  shippingCost: number;
  payer?: { name?: string; email?: string };
}): Promise<string | null> {
  const c = client();
  if (!c) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const items = [...params.items];
  if (params.shippingCost > 0) {
    items.push({ title: "Frete", quantity: 1, unit_price: params.shippingCost });
  }

  try {
    const pref = new Preference(c);
    const result = await pref.create({
      body: {
        items: items.map((it, i) => ({
          id: String(i),
          title: it.title,
          quantity: it.quantity,
          unit_price: it.unit_price,
          currency_id: "BRL",
        })),
        payer: params.payer?.email ? { email: params.payer.email } : undefined,
        external_reference: params.orderId,
        back_urls: {
          success: `${siteUrl}/pedido/${params.orderId}`,
          failure: `${siteUrl}/pedido/${params.orderId}`,
          pending: `${siteUrl}/pedido/${params.orderId}`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
      },
    });
    return result.init_point ?? null;
  } catch {
    return null;
  }
}

/** Consulta o status de um pagamento (usado no webhook). */
export async function getPayment(paymentId: string) {
  const c = client();
  if (!c) return null;
  try {
    const payment = new Payment(c);
    return await payment.get({ id: paymentId });
  } catch {
    return null;
  }
}
