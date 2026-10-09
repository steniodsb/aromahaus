import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lê uma chave de `settings` sem nunca derrubar a página.
 *
 * Estas três configurações são lidas no layout da LOJA INTEIRA. Quando elas
 * estouravam, não caía uma seção: caía todo o site, e no build caía o deploy
 * com um erro que não dizia qual variável faltava. O resto das consultas já
 * falhava em silêncio (ver `lib/queries.ts`); aqui estava a exceção.
 *
 * Falhar em silêncio aqui é seguro porque todo valor sensível tem um padrão
 * conservador: sem configuração, a loja não promete frete grátis e não anuncia
 * parcelamento que não existe.
 */
async function lerSetting<T>(key: string): Promise<Partial<T>> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return (data?.value ?? {}) as Partial<T>;
  } catch (err) {
    console.error(`[store] não consegui ler settings.${key}:`, err);
    return {};
  }
}

/** Dados públicos da loja (usados em e-mails e no remetente do frete). */
export interface StoreInfo {
  name: string;
  /** E-mail público de contato — aparece para o cliente. */
  email: string;
  /**
   * Para onde vão os avisos operacionais (novo pedido, estoque baixo).
   *
   * Separado do e-mail de contato de propósito: um é o endereço que o cliente
   * vê, o outro é a caixa que a equipe acompanha. Podem ser iguais, mas nada
   * obriga. Aceita vários endereços separados por vírgula.
   */
  notificationsEmail: string;
  phone: string;
  whatsapp: string;
  cnpj: string;
  document: string;
  siteUrl: string;
}

/** Endereço de origem (remetente) para gerar etiquetas no Melhor Envio. */
export interface ShippingOrigin {
  from_cep: string;
  from_name: string;
  from_phone: string;
  from_email: string;
  from_document: string;
  from_address: string;
  from_number: string;
  from_complement: string;
  from_district: string;
  from_city: string;
  from_state: string;
  free_shipping_threshold: number;
}

/** Regras de parcelamento no cartão (Admin → Configurações → Checkout). */
export interface CheckoutConfig {
  /** Máximo de parcelas oferecido. O gateway pode devolver mais; cortamos aqui. */
  max_installments: number;
  /**
   * Até quantas parcelas a loja anuncia como "sem juros".
   *
   * ⚠️ Isto NÃO cria parcelamento sem juros — quem define o juro é o Mercado
   * Pago, na configuração da conta do vendedor. Este número só controla o texto
   * de vitrine (barra de avisos). O seletor de parcelas do checkout SEMPRE marca
   * "sem juros" a partir do `installment_rate` real que o MP devolve, para nunca
   * prometer ao cliente um valor diferente do que ele vai pagar.
   */
  interest_free_installments: number;
}

const CHECKOUT_DEFAULTS: CheckoutConfig = {
  max_installments: 12,
  interest_free_installments: 2,
};

/** Lê settings.checkout, com fallback para os padrões. */
export async function getCheckoutConfig(): Promise<CheckoutConfig> {
  const s = await lerSetting<CheckoutConfig>("checkout");

  const max = Number(s.max_installments);
  const free = Number(s.interest_free_installments);

  const maxInstallments =
    Number.isFinite(max) && max >= 1 ? Math.min(Math.trunc(max), 12) : CHECKOUT_DEFAULTS.max_installments;

  return {
    max_installments: maxInstallments,
    // Não faz sentido anunciar mais parcelas sem juros do que o total oferecido.
    interest_free_installments:
      Number.isFinite(free) && free >= 0
        ? Math.min(Math.trunc(free), maxInstallments)
        : Math.min(CHECKOUT_DEFAULTS.interest_free_installments, maxInstallments),
  };
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Lê settings.store, com fallback para variáveis de ambiente / padrões. */
export async function getStoreInfo(): Promise<StoreInfo> {
  const s = await lerSetting<StoreInfo>("store");
  return {
    name: s.name || process.env.NEXT_PUBLIC_STORE_NAME || "Aroma Haus",
    email: s.email || process.env.STORE_EMAIL || "contato@aromahaus.com.br",
    // A env vem ANTES do e-mail de contato de propósito. Sem isso, no primeiro
    // deploy os avisos migrariam sozinhos do endereço que a loja recebe hoje
    // para o `email` de contato — que pode ser um alias sem caixa de verdade.
    // Ninguém percebe que parou de receber aviso de pedido; só nota quando um
    // pedido pago fica dias sem despachar. A mudança só acontece quando alguém
    // digita o endereço no painel.
    notificationsEmail:
      s.notificationsEmail || process.env.STORE_EMAIL || s.email || "",
    phone: s.phone || "",
    whatsapp: s.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5511993549045",
    cnpj: s.cnpj || "",
    document: s.document || "",
    siteUrl: siteUrl(),
  };
}

/** Lê settings.shipping, com fallback para variáveis de ambiente. */
export async function getShippingOrigin(): Promise<ShippingOrigin> {
  const s = (await lerSetting<ShippingOrigin>("shipping")) as Partial<ShippingOrigin> & {
    free_above?: number;
  };
  const threshold = Number(s.free_shipping_threshold ?? s.free_above);
  return {
    from_cep: (s.from_cep || process.env.MELHORENVIO_FROM_CEP || "").replace(/\D/g, ""),
    from_name: s.from_name || "Aroma Haus",
    from_phone: s.from_phone || "",
    from_email: s.from_email || process.env.STORE_EMAIL || "contato@aromahaus.com.br",
    from_document: s.from_document || "",
    from_address: s.from_address || "",
    from_number: s.from_number || "",
    from_complement: s.from_complement || "",
    from_district: s.from_district || "",
    from_city: s.from_city || "",
    from_state: s.from_state || "",
    free_shipping_threshold: Number.isFinite(threshold) ? threshold : 0,
  };
}
