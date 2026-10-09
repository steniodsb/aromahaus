import "server-only";
import crypto from "node:crypto";
import type {
  CreateChargeInput,
  CreateChargeResult,
  OrderStatus,
  PaymentGateway,
  PaymentSnapshot,
} from "./types";

/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️  CONTRATO DA API DO C6 — ÚNICO BLOCO A CORRIGIR
 * ══════════════════════════════════════════════════════════════════════════
 * A documentação do C6 é fechada (só liberada após cadastro em
 * developers.c6bank.com.br + homologação). Os valores abaixo são a estrutura
 * mais provável, baseada no padrão OAuth2 client_credentials que os bancos
 * brasileiros usam — mas NÃO foram verificados contra a doc oficial.
 *
 * Quando as credenciais e a documentação chegarem, ajuste SOMENTE este bloco.
 * O restante do arquivo é genérico e não precisa mudar.
 *
 * Checklist do que confirmar na doc:
 *  1. URLs de sandbox e produção
 *  2. Endpoint e formato do token (grant_type, escopo, se vai em body ou Basic)
 *  3. Endpoint de criação de cobrança + nomes dos campos do payload
 *  4. Onde vem a URL de checkout na resposta
 *  5. Onde vem o id da cobrança e como devolvemos nosso `orderId` (external ref)
 *  6. Valores de status e como o webhook assina a requisição
 *  7. Se a API exige mTLS (certificado) — ver `c6Fetch()` abaixo e `docs/C6.md`
 * ────────────────────────────────────────────────────────────────────────── */
const C6_CONTRACT = {
  baseUrl: {
    sandbox: "https://baas-api-sandbox.c6bank.info",
    production: "https://baas-api.c6bank.info",
  },

  endpoints: {
    /** OAuth2 — troca client_id/secret por access_token. */
    token: "/v1/auth/oauth2/token",
    /** Cria a cobrança/checkout do e-commerce. */
    createCharge: "/v1/ecommerce/charges",
    /** Consulta uma cobrança pelo id (`:id` é substituído). */
    getCharge: "/v1/ecommerce/charges/:id",
  },

  /** Escopos pedidos no token. Vazio = não envia o parâmetro. */
  scope: "ecommerce",

  /** Caminhos onde procuramos cada informação na resposta do C6.
   *  Vários candidatos porque o nome exato ainda não está confirmado —
   *  o primeiro que existir é usado. */
  responsePaths: {
    checkoutUrl: ["checkout_url", "payment_url", "url", "link", "data.checkout_url"],
    chargeId: ["id", "charge_id", "transaction_id", "data.id"],
    status: ["status", "payment_status", "data.status"],
    externalReference: ["external_reference", "external_id", "reference", "data.external_reference"],
  },

  /** Status do C6 → status interno. Chaves em minúsculo.
   *  Cobrimos as grafias mais comuns (PT e EN); apague o que não existir. */
  statusMap: {
    paid: "paid",
    approved: "paid",
    confirmed: "paid",
    settled: "paid",
    pago: "paid",
    aprovado: "paid",
    confirmada: "paid",

    pending: "pending",
    processing: "pending",
    waiting_payment: "pending",
    created: "pending",
    pendente: "pending",
    aguardando: "pending",
    processando: "pending",

    canceled: "canceled",
    cancelled: "canceled",
    rejected: "canceled",
    denied: "canceled",
    expired: "canceled",
    failed: "canceled",
    cancelado: "canceled",
    recusado: "canceled",
    expirado: "canceled",

    refunded: "refunded",
    chargeback: "refunded",
    reversed: "refunded",
    estornado: "refunded",
    reembolsado: "refunded",
  } as Record<string, OrderStatus>,
} as const;

/* ══════════════════════════════════════════════════════════════════════════
 * Daqui para baixo é genérico — não deve precisar de ajuste.
 * ══════════════════════════════════════════════════════════════════════════ */

function baseUrl(): string {
  const override = process.env.C6_BASE_URL;
  if (override) return override.replace(/\/+$/, "");
  return process.env.C6_ENV === "production"
    ? C6_CONTRACT.baseUrl.production
    : C6_CONTRACT.baseUrl.sandbox;
}

export function isC6Configured(): boolean {
  return Boolean(process.env.C6_CLIENT_ID && process.env.C6_CLIENT_SECRET);
}

/**
 * Ponto único de saída HTTP para o C6.
 *
 * ⚠️ mTLS: se a homologação revelar que o C6 exige certificado cliente (comum
 * em APIs bancárias), o passo a passo está em `docs/C6.md` — são ~8 linhas
 * aqui dentro. Deixamos de fora por enquanto para não adicionar dependência
 * por suposição.
 */
async function c6Fetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, init);
}

// ── Token OAuth2 (cache em memória) ─────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.C6_CLIENT_ID;
  const clientSecret = process.env.C6_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Reaproveita o token enquanto faltar mais de 60s para expirar
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  if (C6_CONTRACT.scope) body.set("scope", C6_CONTRACT.scope);

  try {
    const res = await c6Fetch(C6_CONTRACT.endpoints.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body,
    });
    if (!res.ok) {
      console.error("[c6] falha ao obter token:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 300) * 1000,
    };
    return cachedToken.value;
  } catch (err) {
    console.error("[c6] erro de rede ao obter token:", err);
    return null;
  }
}

// ── Helpers de leitura da resposta ──────────────────────────────────────────

/** Lê `a.b.c` de um objeto desconhecido. */
function readPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** Primeiro caminho que devolver string/número não-vazio. */
function pick(obj: unknown, paths: readonly string[]): string | null {
  for (const p of paths) {
    const v = readPath(obj, p);
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

export function mapC6Status(raw: string | null | undefined): OrderStatus {
  if (!raw) return "pending";
  return C6_CONTRACT.statusMap[raw.toLowerCase().trim()] ?? "pending";
}

// ── Operações do gateway ────────────────────────────────────────────────────

async function createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
  const token = await getAccessToken();
  if (!token) return { checkoutUrl: null };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const items = [...input.items];
  if (input.shippingCost > 0) {
    items.push({ title: "Frete", quantity: 1, unit_price: input.shippingCost });
  }
  const amount = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);

  /* ⚠️ Payload provável — confirmar nomes dos campos na doc oficial.
   * Enviamos `amount` em centavos (padrão da maioria das APIs bancárias BR).
   * Se o C6 esperar reais decimais, troque por Number(amount.toFixed(2)). */
  const payload = {
    external_reference: input.orderId,
    amount: Math.round(amount * 100),
    currency: "BRL",
    items: items.map((it) => ({
      description: it.title,
      quantity: it.quantity,
      unit_amount: Math.round(it.unit_price * 100),
    })),
    customer: {
      name: input.payer?.name,
      email: input.payer?.email,
      phone: input.payer?.phone?.replace(/\D/g, ""),
      document: input.payer?.document?.replace(/\D/g, ""),
    },
    redirect_urls: {
      success: `${siteUrl}/pedido/${input.orderId}`,
      failure: `${siteUrl}/pedido/${input.orderId}`,
      pending: `${siteUrl}/pedido/${input.orderId}`,
    },
    notification_url: `${siteUrl}/api/c6/webhook`,
  };

  try {
    const res = await c6Fetch(C6_CONTRACT.endpoints.createCharge, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[c6] falha ao criar cobrança:", res.status, await res.text().catch(() => ""));
      return { checkoutUrl: null };
    }
    const data = await res.json();
    return {
      checkoutUrl: pick(data, C6_CONTRACT.responsePaths.checkoutUrl),
      chargeId: pick(data, C6_CONTRACT.responsePaths.chargeId),
    };
  } catch (err) {
    console.error("[c6] erro de rede ao criar cobrança:", err);
    return { checkoutUrl: null };
  }
}

async function getPayment(paymentId: string): Promise<PaymentSnapshot | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const path = C6_CONTRACT.endpoints.getCharge.replace(":id", encodeURIComponent(paymentId));

  try {
    const res = await c6Fetch(path, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const rawStatus = pick(data, C6_CONTRACT.responsePaths.status) ?? "";
    return {
      status: mapC6Status(rawStatus),
      rawStatus,
      paymentId: pick(data, C6_CONTRACT.responsePaths.chargeId) ?? paymentId,
      orderId: pick(data, C6_CONTRACT.responsePaths.externalReference),
    };
  } catch (err) {
    console.error("[c6] erro ao consultar cobrança:", err);
    return null;
  }
}

/**
 * Valida a assinatura do webhook.
 * Enquanto `C6_WEBHOOK_SECRET` não estiver definido, aceita (mesma política do
 * Mercado Pago, para permitir testes antes de o segredo ser configurado).
 *
 * ⚠️ O esquema abaixo é HMAC-SHA256 do corpo cru — confirmar na doc do C6
 * qual header é usado e qual o manifesto assinado.
 */
export function verifyC6Signature(request: Request, rawBody: string): boolean {
  const secret = process.env.C6_WEBHOOK_SECRET;
  if (!secret) return true;

  const received =
    request.headers.get("x-c6-signature") ??
    request.headers.get("x-signature") ??
    request.headers.get("x-hub-signature-256");
  if (!received) return false;

  // Aceita tanto "abc123" quanto "sha256=abc123"
  const clean = received.includes("=") ? received.split("=").pop()!.trim() : received.trim();

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean));
  } catch {
    return false;
  }
}

/** Extrai o id da cobrança do corpo do webhook. */
export function extractC6PaymentId(body: unknown): string | null {
  return pick(body, [
    "id",
    "charge_id",
    "transaction_id",
    "data.id",
    "data.charge_id",
    "payment.id",
    "resource.id",
  ]);
}

export const c6Gateway: PaymentGateway = {
  id: "c6",
  label: "C6 Bank",
  isConfigured: isC6Configured,
  createCharge,
  getPayment,
};
