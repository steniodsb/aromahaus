import "server-only";
import type { ShippingOrigin } from "@/lib/store";

export interface ShippingItem {
  width_cm: number;
  height_cm: number;
  length_cm: number;
  weight_g: number;
  price: number;
  qty: number;
}

export interface ShippingQuote {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryTime: number; // dias úteis
}

const BASE = process.env.MELHORENVIO_BASE_URL ?? "https://sandbox.melhorenvio.com.br";
const UA = "Aroma Haus (contato@aromahaus.com.br)";

export function isMelhorEnvioConfigured() {
  return Boolean(process.env.MELHORENVIO_TOKEN);
}

function meHeaders(token: string) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "User-Agent": UA,
  };
}

/**
 * Calcula opções de frete via Melhor Envio.
 * Retorna [] se as credenciais não estiverem configuradas ou em caso de erro,
 * para que o checkout continue funcionando (frete a combinar).
 */
export async function calculateShipping(
  toCep: string,
  items: ShippingItem[],
  fromCepOverride?: string,
): Promise<ShippingQuote[]> {
  const token = process.env.MELHORENVIO_TOKEN;
  const fromCep = fromCepOverride || process.env.MELHORENVIO_FROM_CEP;
  if (!token || !fromCep || !toCep) return [];

  const products = items.map((it, i) => ({
    id: String(i + 1),
    width: Math.max(1, it.width_cm || 11),
    height: Math.max(1, it.height_cm || 2),
    length: Math.max(1, it.length_cm || 16),
    weight: Math.max(0.05, (it.weight_g || 300) / 1000),
    insurance_value: it.price,
    quantity: it.qty,
  }));

  try {
    const res = await fetch(`${BASE}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: meHeaders(token),
      body: JSON.stringify({
        from: { postal_code: fromCep.replace(/\D/g, "") },
        to: { postal_code: toCep.replace(/\D/g, "") },
        products,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      id: number;
      name: string;
      price: string;
      error?: string;
      delivery_time: number;
      company: { name: string };
    }>;
    return data
      .filter((s) => !s.error && s.price)
      .map((s) => ({
        id: s.id,
        name: s.name,
        company: s.company?.name ?? "",
        price: Number(s.price),
        deliveryTime: s.delivery_time,
      }));
  } catch {
    return [];
  }
}

// ── Geração de etiqueta (cart → checkout → generate → print) ────────────────

export interface ShipmentOrderInput {
  serviceId: number; // id da cotação (quote) escolhida
  to: {
    name: string;
    email?: string;
    phone?: string;
    document?: string; // CPF do destinatário (opcional no sandbox)
    address: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state_abbr: string;
    postal_code: string;
  };
  items: ShippingItem[];
  totalValue: number; // valor segurado (subtotal)
  /** Declaração de conteúdo. Exigida pelo ME quando `non_commercial`. */
  products?: { name: string; quantity: number; unitary_value: number }[];
}

export interface ShipmentResult {
  ok: boolean;
  melhorenvioOrderId?: string;
  trackingCode?: string | null;
  labelUrl?: string | null;
  error?: string;
}

/** Soma as caixas em um único volume (aproximação: empilha alturas, mantém maior L/W). */
function packVolume(items: ShippingItem[]) {
  let height = 0;
  let width = 11;
  let length = 16;
  let weight = 0;
  for (const it of items) {
    const qty = it.qty || 1;
    height += (it.height_cm || 2) * qty;
    width = Math.max(width, it.width_cm || 11);
    length = Math.max(length, it.length_cm || 16);
    weight += ((it.weight_g || 300) / 1000) * qty;
  }
  return {
    height: Math.max(2, Math.round(height)),
    width: Math.max(11, Math.round(width)),
    length: Math.max(16, Math.round(length)),
    weight: Math.max(0.1, Number(weight.toFixed(2))),
  };
}

/** Último erro do Melhor Envio, para a mensagem chegar a quem clicou. */
let ultimoErroME: string | null = null;

/**
 * Traduz o corpo de erro do Melhor Envio em uma linha legível.
 *
 * Eles devolvem `{message, errors: {campo: [motivo]}}`. Antes descartávamos
 * isso e a tela mostrava um palpite genérico ("verifique origem/serviço") que
 * já mandou procurar no lugar errado — o erro real era CNPJ no campo de CPF.
 */
function erroME(status: number, corpo: string): string {
  try {
    const j = JSON.parse(corpo) as { message?: string; errors?: Record<string, string[]> };
    const detalhes = Object.entries(j.errors ?? {})
      .map(([campo, msgs]) => `${campo}: ${msgs.join(", ")}`)
      .join(" · ");
    return detalhes || j.message || `HTTP ${status}`;
  } catch {
    return `HTTP ${status}`;
  }
}

async function mePost<T = unknown>(path: string, token: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: meHeaders(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      ultimoErroME = erroME(res.status, corpo);
      console.error(`[melhorenvio] ${path} -> ${res.status}: ${corpo.slice(0, 400)}`);
      return null;
    }
    ultimoErroME = null;
    return (await res.json()) as T;
  } catch (err) {
    ultimoErroME = "Não consegui falar com o Melhor Envio.";
    console.error(`[melhorenvio] ${path} falhou:`, err);
    return null;
  }
}

/**
 * Monta o par documento/CNPJ do jeito que o Melhor Envio espera.
 *
 * A API tem DOIS campos: `document` só aceita CPF (11 dígitos) e
 * `company_document` só aceita CNPJ (14). Mandar o CNPJ em `document` devolve
 * "O campo from.document deve ter um CPF válido" — que foi exatamente o que
 * travou a primeira etiqueta. A formatação também precisa sair: eles querem
 * só dígitos.
 */
function documentos(valor: string | undefined | null) {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length === 14) return { company_document: digitos };
  if (digitos.length === 11) return { document: digitos };
  return {};
}

/**
 * Cria a etiqueta no Melhor Envio para um pedido: adiciona ao carrinho,
 * paga (checkout, usa saldo da conta), gera e imprime a etiqueta.
 * Retorna o id do envio, o código de rastreio e a URL do PDF.
 */
export async function createShipmentForOrder(
  origin: ShippingOrigin,
  input: ShipmentOrderInput,
): Promise<ShipmentResult> {
  const token = process.env.MELHORENVIO_TOKEN;
  if (!token) return { ok: false, error: "Melhor Envio não configurado (token ausente)." };
  if (!origin.from_cep) return { ok: false, error: "CEP de origem não configurado em Configurações → Frete." };
  if (!origin.from_address || !origin.from_city || !origin.from_state) {
    return { ok: false, error: "Endereço de origem incompleto em Configurações → Frete." };
  }
  if (!input.serviceId) return { ok: false, error: "Serviço de frete não selecionado no pedido." };
  // O Melhor Envio em produção exige documento do remetente na etiqueta. Sem
  // este guard o erro vinha da API deles, genérico, e ninguém ligava a causa
  // ao campo vazio em Configurações → Frete.
  if (!origin.from_document) {
    return {
      ok: false,
      error: "Falta o CNPJ (ou CPF) do remetente em Configurações → Frete. O Melhor Envio exige para emitir a etiqueta.",
    };
  }

  const vol = packVolume(input.items);

  // 1) Adiciona ao carrinho
  const cart = await mePost<{ id: string }>("/api/v2/me/cart", token, {
    service: input.serviceId,
    from: {
      name: origin.from_name,
      phone: origin.from_phone || undefined,
      email: origin.from_email || undefined,
      ...documentos(origin.from_document),
      address: origin.from_address,
      number: origin.from_number || "S/N",
      complement: origin.from_complement || undefined,
      district: origin.from_district || undefined,
      city: origin.from_city,
      state_abbr: origin.from_state,
      postal_code: origin.from_cep,
    },
    to: {
      name: input.to.name,
      phone: input.to.phone || undefined,
      email: input.to.email || undefined,
      ...documentos(input.to.document),
      address: input.to.address,
      number: input.to.number || "S/N",
      complement: input.to.complement || undefined,
      district: input.to.district || undefined,
      city: input.to.city,
      state_abbr: input.to.state_abbr,
      postal_code: input.to.postal_code.replace(/\D/g, ""),
    },
    volumes: [vol],
    // Obrigatório junto com `non_commercial`: é a declaração de conteúdo que
    // vai na etiqueta. Sem isto o ME devolve 422 "É necessário informar ao
    // menos um produto".
    products: input.products?.length
      ? input.products
      : [{ name: "Peças e acessórios automotivos", quantity: 1, unitary_value: input.totalValue }],
    options: {
      insurance_value: input.totalValue,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: true,
    },
  });
  if (!cart?.id) {
    return {
      ok: false,
      error: ultimoErroME
        ? `Melhor Envio recusou: ${ultimoErroME}`
        : "Falha ao adicionar ao carrinho do Melhor Envio.",
    };
  }

  const orderId = cart.id;

  // 2) Checkout (compra da etiqueta — usa o saldo da conta Melhor Envio)
  const checkout = await mePost<{ purchase?: unknown }>("/api/v2/me/shipment/checkout", token, {
    orders: [orderId],
  });
  if (!checkout) {
    return { ok: false, melhorenvioOrderId: orderId, error: "Falha no checkout do frete — verifique o saldo da conta Melhor Envio." };
  }

  // 3) Gera a etiqueta
  await mePost("/api/v2/me/shipment/generate", token, { orders: [orderId] });

  // 4) Imprime (PDF público)
  const print = await mePost<{ url?: string }>("/api/v2/me/shipment/print", token, {
    orders: [orderId],
    mode: "public",
  });

  // 5) Rastreio
  const tracking = await trackShipment(orderId);

  return {
    ok: true,
    melhorenvioOrderId: orderId,
    trackingCode: tracking,
    labelUrl: print?.url ?? null,
  };
}

/** Consulta o código de rastreio de um envio já gerado. */
export async function trackShipment(melhorenvioOrderId: string): Promise<string | null> {
  const token = process.env.MELHORENVIO_TOKEN;
  if (!token) return null;
  const data = await mePost<Record<string, { tracking?: string }>>(
    "/api/v2/me/shipment/tracking",
    token,
    { orders: [melhorenvioOrderId] },
  );
  const entry = data?.[melhorenvioOrderId];
  return entry?.tracking ?? null;
}
