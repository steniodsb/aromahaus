import "server-only";
import { mercadoPagoGateway } from "./mercadopago-gateway";
import { c6Gateway } from "./c6";
import type { PaymentGateway } from "./types";

export * from "./types";
export { applyPaymentSnapshot } from "./order-events";
export { mercadoPagoGateway, c6Gateway };

const GATEWAYS: PaymentGateway[] = [mercadoPagoGateway, c6Gateway];

/**
 * Gateway ativo da loja.
 *
 * Definido por `PAYMENT_GATEWAY` (`mercadopago` | `c6`). Se a variável não
 * existir — ou apontar para um gateway sem credenciais — cai no primeiro
 * gateway configurado. Assim, ligar o C6 é só trocar a env: nada de código.
 *
 * Retorna `null` quando nenhum está configurado; nesse caso o checkout segue
 * funcionando e o pagamento cai no fallback por WhatsApp.
 */
export function getActiveGateway(): PaymentGateway | null {
  const preferred = process.env.PAYMENT_GATEWAY?.trim().toLowerCase();

  if (preferred) {
    const match = GATEWAYS.find((g) => g.id === preferred);
    if (match?.isConfigured()) return match;
    if (match) {
      console.warn(
        `[payments] PAYMENT_GATEWAY="${preferred}" está selecionado mas sem credenciais — usando fallback.`,
      );
    }
  }

  return GATEWAYS.find((g) => g.isConfigured()) ?? null;
}

/** Busca um gateway pelo id (usado pelos webhooks, que são específicos). */
export function getGateway(id: string): PaymentGateway | null {
  return GATEWAYS.find((g) => g.id === id) ?? null;
}
