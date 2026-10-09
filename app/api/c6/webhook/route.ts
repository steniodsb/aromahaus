import { NextResponse } from "next/server";
import { c6Gateway, extractC6PaymentId, verifyC6Signature } from "@/lib/payments/c6";
import { applyPaymentSnapshot } from "@/lib/payments/order-events";

export const runtime = "nodejs";

/**
 * Webhook de notificação de pagamento do C6 Bank.
 *
 * Fluxo (igual ao do Mercado Pago): valida a assinatura → extrai o id da
 * cobrança → consulta o status real na API (nunca confia no corpo recebido)
 * → aplica ao pedido.
 *
 * ⚠️ Cadastrar esta URL no portal do C6: `https://SEU-SITE/api/c6/webhook`
 */
export async function POST(request: Request) {
  try {
    // Lê o corpo cru — a assinatura HMAC é calculada sobre ele
    const rawBody = await request.text();

    if (!verifyC6Signature(request, rawBody)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    const body = rawBody ? JSON.parse(rawBody) : {};
    const paymentId = extractC6PaymentId(body);
    if (!paymentId) return NextResponse.json({ ok: true });

    // Consulta o status real na API do C6 (o corpo do webhook não é fonte de verdade)
    const snapshot = await c6Gateway.getPayment(paymentId);
    if (!snapshot?.orderId) return NextResponse.json({ ok: true });

    await applyPaymentSnapshot(snapshot);

    return NextResponse.json({ ok: true });
  } catch {
    // Sempre 200 para o C6 não reenviar indefinidamente
    return NextResponse.json({ ok: true });
  }
}
