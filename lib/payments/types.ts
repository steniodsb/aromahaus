import "server-only";

/** Status interno do pedido (o mesmo usado na tabela `orders`). */
export type OrderStatus = "pending" | "paid" | "canceled" | "refunded";

export interface ChargeItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface ChargePayer {
  name?: string;
  email?: string;
  phone?: string;
  /** CPF/CNPJ — só dígitos. Alguns gateways exigem. */
  document?: string;
}

export interface CreateChargeInput {
  orderId: string;
  items: ChargeItem[];
  shippingCost: number;
  payer?: ChargePayer;
}

export interface CreateChargeResult {
  /** URL para onde o cliente é redirecionado para pagar. `null` = não configurado. */
  checkoutUrl: string | null;
  /** Id da cobrança no gateway, quando ele devolve na criação. */
  chargeId?: string | null;
}

export interface PaymentSnapshot {
  /** Status já traduzido para o vocabulário interno. */
  status: OrderStatus;
  /** Status cru do gateway (guardado em `orders.payment_status` para auditoria). */
  rawStatus: string;
  /** Id do pagamento no gateway. */
  paymentId: string;
  /** Id do pedido na nossa base (external reference). */
  orderId: string | null;
}

/**
 * Contrato que todo gateway de pagamento precisa cumprir.
 * Permite trocar Mercado Pago ↔ C6 (ou rodar os dois) sem mexer no checkout.
 */
export interface PaymentGateway {
  /** Identificador gravado em `orders.payment_method`. */
  readonly id: string;
  /** Nome exibido para o cliente. */
  readonly label: string;
  /** `false` quando faltam credenciais — a loja cai no fallback (WhatsApp). */
  isConfigured(): boolean;
  /** Cria a cobrança e devolve a URL de pagamento. */
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  /** Consulta um pagamento pelo id (usado pelo webhook). */
  getPayment(paymentId: string): Promise<PaymentSnapshot | null>;
}
