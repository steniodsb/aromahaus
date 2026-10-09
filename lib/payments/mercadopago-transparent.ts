import "server-only";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { mapMercadoPagoStatus } from "./mercadopago-gateway";
import type { OrderStatus } from "./types";

/** Meio de pagamento escolhido no checkout transparente. */
export type PaymentKind = "pix" | "card" | "boleto";

export interface DirectPaymentInput {
  orderId: string;
  amount: number;
  description: string;
  kind: PaymentKind;
  payer: {
    name: string;
    email: string;
    /** CPF — só dígitos. Obrigatório em todos os meios. */
    document: string;
  };
  /** Endereço — exigido pelo Mercado Pago para boleto. */
  address?: {
    cep: string;
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
  };
  /** Presente apenas quando `kind === "card"`. */
  card?: {
    /** Token gerado pelo MercadoPago.js NO BROWSER. */
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId?: string;
  };
  /** Fingerprint do dispositivo (melhora aprovação antifraude). */
  deviceId?: string;
}

export interface PixDetails {
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
  expires_at?: string;
}

export interface BoletoDetails {
  url: string;
  barcode?: string;
}

export interface DirectPaymentResult {
  ok: boolean;
  status: OrderStatus;
  rawStatus: string;
  paymentId?: string;
  pix?: PixDetails;
  boleto?: BoletoDetails;
  /** Mensagem pronta para exibir ao cliente quando algo falha. */
  error?: string;
}

/** Boleto do Mercado Pago no Brasil. */
const BOLETO_METHOD_ID = "bolbradesco";

/** Pix expira em 30 minutos. */
const PIX_EXPIRATION_MINUTES = 30;

/**
 * Data de expiração no formato que o Mercado Pago exige:
 * `yyyy-MM-dd'T'HH:mm:ss.SSSZ` com offset numérico explícito.
 *
 * ⚠️ NÃO trocar por `toISOString()`: ele termina em "Z" e a API responde
 * 400 ("must be valid date and format"), derrubando TODO pagamento via Pix.
 * O offset é escrito à mão em UTC para não depender do fuso do servidor.
 */
function expiresIn(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString().replace("Z", "+00:00");
}

/**
 * URL do webhook, ou `null` quando a loja está rodando em localhost.
 *
 * O Mercado Pago valida o `notification_url` e devolve 400
 * ("notificaction_url attribute must be url valid" — o typo é deles) para
 * qualquer host não público. Mandar o campo em dev quebraria TODO pagamento
 * na máquina do dev; omitir só custa o webhook, que em localhost o MP não
 * conseguiria chamar de qualquer jeito.
 */
function notificationUrl(siteUrl: string): string | null {
  let host: string;
  try {
    host = new URL(siteUrl).hostname;
  } catch {
    return null;
  }
  const local = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  if (local) {
    console.warn(
      `[mp-transparent] NEXT_PUBLIC_SITE_URL="${siteUrl}" não é público — pagamento criado SEM webhook. ` +
        `Em produção isso precisa ser o domínio real, senão o pedido nunca sai de "pending".`,
    );
    return null;
  }
  return `${siteUrl}/api/mercadopago/webhook`;
}

function client(): MercadoPagoConfig | null {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;
  return new MercadoPagoConfig({ accessToken });
}

function splitName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0] ?? "", last_name: parts[0] ?? "" };
  return { first_name: parts[0]!, last_name: parts.slice(1).join(" ") };
}

/**
 * Traduz a recusa do Mercado Pago para uma mensagem que o cliente entende.
 * Os códigos vêm em `status_detail`.
 */
function friendlyError(statusDetail: string | undefined): string {
  switch (statusDetail) {
    case "cc_rejected_insufficient_amount":
      return "Cartão sem limite suficiente. Tente outro cartão ou pague com Pix.";
    case "cc_rejected_bad_filled_card_number":
      return "Número do cartão inválido. Confira e tente de novo.";
    case "cc_rejected_bad_filled_date":
      return "Data de validade inválida. Confira e tente de novo.";
    case "cc_rejected_bad_filled_security_code":
      return "Código de segurança (CVV) inválido. Confira e tente de novo.";
    case "cc_rejected_bad_filled_other":
      return "Dados do cartão incorretos. Confira e tente de novo.";
    case "cc_rejected_high_risk":
      return "Pagamento não autorizado pelo antifraude. Tente com Pix ou outro cartão.";
    case "cc_rejected_call_for_authorize":
      return "Seu banco precisa autorizar esta compra. Ligue para o banco ou use outro cartão.";
    case "cc_rejected_card_disabled":
      return "Cartão desabilitado. Fale com o seu banco ou use outro cartão.";
    case "cc_rejected_duplicated_payment":
      return "Você já fez um pagamento igual há pouco. Confira antes de tentar de novo.";
    case "cc_rejected_max_attempts":
      return "Muitas tentativas com este cartão. Tente outro cartão ou pague com Pix.";
    default:
      return "Não foi possível aprovar o pagamento. Tente outro meio de pagamento.";
  }
}

/**
 * Cria o pagamento diretamente na API do Mercado Pago (checkout transparente).
 *
 * ⚠️ SEGURANÇA: os dados do cartão NUNCA passam por aqui. O browser tokeniza
 * via MercadoPago.js e só o `token` (descartável) chega ao servidor — é isso
 * que mantém a loja fora do escopo pesado de PCI-DSS.
 */
export async function createDirectPayment(
  input: DirectPaymentInput,
): Promise<DirectPaymentResult> {
  const c = client();
  if (!c) {
    return { ok: false, status: "pending", rawStatus: "", error: "Pagamento não configurado." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { first_name, last_name } = splitName(input.payer.name);
  const document = input.payer.document.replace(/\D/g, "");

  const webhook = notificationUrl(siteUrl);

  // Corpo comum a todos os meios de pagamento
  const body: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description,
    external_reference: input.orderId,
    ...(webhook ? { notification_url: webhook } : {}),
    payer: {
      email: input.payer.email,
      first_name,
      last_name,
      identification: { type: "CPF", number: document },
    },
  };

  if (input.kind === "pix") {
    body.payment_method_id = "pix";
    body.date_of_expiration = expiresIn(PIX_EXPIRATION_MINUTES);
  }

  if (input.kind === "boleto") {
    body.payment_method_id = BOLETO_METHOD_ID;
    // O Mercado Pago exige endereço completo para emitir boleto
    if (input.address) {
      (body.payer as Record<string, unknown>).address = {
        zip_code: input.address.cep.replace(/\D/g, ""),
        street_name: input.address.street,
        street_number: input.address.number,
        neighborhood: input.address.district,
        city: input.address.city,
        federal_unit: input.address.state,
      };
    }
  }

  if (input.kind === "card") {
    if (!input.card?.token) {
      return { ok: false, status: "pending", rawStatus: "", error: "Dados do cartão inválidos." };
    }
    body.token = input.card.token;
    body.installments = input.card.installments || 1;
    body.payment_method_id = input.card.paymentMethodId;
    if (input.card.issuerId) body.issuer_id = input.card.issuerId;
    // Aprovado ou recusado na hora — evita cartão em "pending" indefinido
    body.binary_mode = true;
  }

  try {
    const payment = new Payment(c);
    const res = await payment.create({
      body,
      requestOptions: {
        // Evita cobrança duplicada se a requisição for repetida
        idempotencyKey: `${input.orderId}-${input.kind}`,
        ...(input.deviceId ? { meliSessionId: input.deviceId } : {}),
      },
    });

    const rawStatus = res.status ?? "";
    const status = mapMercadoPagoStatus(rawStatus);
    const paymentId = res.id != null ? String(res.id) : undefined;

    // Pix — QR code para o cliente pagar na tela
    if (input.kind === "pix") {
      const tx = res.point_of_interaction?.transaction_data;
      if (!tx?.qr_code) {
        return { ok: false, status, rawStatus, paymentId, error: "Não foi possível gerar o Pix. Tente outro meio de pagamento." };
      }
      return {
        ok: true,
        status,
        rawStatus,
        paymentId,
        pix: {
          qr_code: tx.qr_code,
          qr_code_base64: tx.qr_code_base64 ?? "",
          ticket_url: tx.ticket_url,
          expires_at: res.date_of_expiration ?? undefined,
        },
      };
    }

    // Boleto — link do PDF + linha digitável
    if (input.kind === "boleto") {
      const details = res.transaction_details;
      const url = details?.external_resource_url;
      if (!url) {
        return { ok: false, status, rawStatus, paymentId, error: "Não foi possível gerar o boleto. Tente outro meio de pagamento." };
      }
      return {
        ok: true,
        status,
        rawStatus,
        paymentId,
        boleto: {
          url,
          // `digitable_line` é a linha digitável (o que o cliente digita no
          // app do banco); o barcode cru é só fallback.
          barcode: details?.digitable_line || details?.barcode?.content,
        },
      };
    }

    // Cartão — aprovado na hora ou recusado
    if (status === "paid") {
      return { ok: true, status, rawStatus, paymentId };
    }
    return {
      ok: false,
      status,
      rawStatus,
      paymentId,
      error: friendlyError(res.status_detail),
    };
  } catch (err) {
    console.error("[mp-transparent] falha ao criar pagamento:", err);
    return {
      ok: false,
      status: "pending",
      rawStatus: "",
      error: "Erro ao processar o pagamento. Tente novamente em instantes.",
    };
  }
}

// ── Estorno ─────────────────────────────────────────────────────────────────

export interface RefundResult {
  ok: boolean;
  /** Valor efetivamente estornado, conforme o Mercado Pago respondeu. */
  amount?: number;
  error?: string;
}

/**
 * Estorna um pagamento no Mercado Pago.
 *
 * Sem `amount` estorna tudo; com `amount` faz estorno parcial (o MP aceita
 * vários parciais até somar o total). O dinheiro volta pelo mesmo meio que
 * entrou — não há como escolher outro.
 *
 * Idempotency key derivada do pagamento + valor: se o admin clicar duas vezes,
 * o MP reconhece a repetição em vez de estornar de novo. Sem isso, dois
 * cliques em estorno parcial devolveriam o dobro.
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
): Promise<RefundResult> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "Mercado Pago não configurado." };
  if (!paymentId) return { ok: false, error: "Pedido sem pagamento no Mercado Pago." };

  const corpo = amount != null ? JSON.stringify({ amount }) : "{}";

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `refund-${paymentId}-${amount ?? "total"}`,
      },
      body: corpo,
    });

    const json = (await res.json().catch(() => ({}))) as {
      amount?: number;
      message?: string;
      error?: string;
      status?: string;
    };

    if (!res.ok) {
      // O MP devolve mensagens em inglês e às vezes só um código. Passamos o
      // texto adiante porque um erro específico ("payment already refunded")
      // é mais útil do que "falhou".
      const motivo = json.message || json.error || `HTTP ${res.status}`;
      console.error(`[estorno] pagamento ${paymentId}:`, motivo);
      return { ok: false, error: traduzRefund(motivo) };
    }

    return { ok: true, amount: json.amount };
  } catch (err) {
    console.error(`[estorno] falha de rede no pagamento ${paymentId}:`, err);
    return { ok: false, error: "Não consegui falar com o Mercado Pago. Tente de novo." };
  }
}

/** As mensagens do MP chegam em inglês; as comuns viram texto acionável. */
function traduzRefund(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already") && m.includes("refund")) return "Este pagamento já foi estornado.";
  if (m.includes("not found")) return "Pagamento não encontrado no Mercado Pago.";
  if (m.includes("amount")) return "Valor de estorno inválido (maior que o disponível).";
  if (m.includes("status")) return "O pagamento não está num estado que permite estorno.";
  if (m.includes("insufficient")) return "Saldo insuficiente na conta para estornar.";
  return `Mercado Pago recusou: ${msg}`;
}
