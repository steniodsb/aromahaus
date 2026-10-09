import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { mercadoPagoGateway } from "@/lib/payments/mercadopago-gateway";
import { applyPaymentSnapshot } from "@/lib/payments/order-events";

export const runtime = "nodejs";

/**
 * Valida a assinatura (x-signature) enviada pelo Mercado Pago.
 * Só valida quando MERCADOPAGO_WEBHOOK_SECRET estiver configurado —
 * enquanto não houver secret (ex.: sandbox inicial), aceita normalmente.
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function isValidSignature(request: Request, dataId: string | null): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // validação desativada até o secret ser definido

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // id alfanumérico deve ser minúsculo; numérico fica como está
  const id = dataId ? (/^\d+$/.test(dataId) ? dataId : dataId.toLowerCase()) : "";

  let manifest = `id:${id};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    // MP envia o id ora na query, ora no corpo
    const queryDataId = url.searchParams.get("data.id");
    const paymentId = queryDataId || body?.data?.id || body?.id;
    const type = url.searchParams.get("type") || body?.type;

    // Rejeita notificações com assinatura inválida (quando o secret está configurado)
    if (!isValidSignature(request, queryDataId ?? (paymentId ? String(paymentId) : null))) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    if (!paymentId || (type && type !== "payment")) {
      return NextResponse.json({ ok: true });
    }

    const snapshot = await mercadoPagoGateway.getPayment(String(paymentId));
    if (!snapshot?.orderId) return NextResponse.json({ ok: true });

    // Atualiza o pedido + estoque + e-mails (lógica compartilhada entre gateways)
    await applyPaymentSnapshot(snapshot);

    return NextResponse.json({ ok: true });
  } catch {
    // Sempre 200 para o MP não ficar reenviando indefinidamente
    return NextResponse.json({ ok: true });
  }
}
