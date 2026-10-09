"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck, ShieldCheck, CreditCard, Gift } from "lucide-react";
import { useStoreConfig } from "@/lib/store-config-context";
import { formatBRL } from "@/lib/utils";

/**
 * Monta o texto de parcelamento a partir da configuração da loja.
 *
 * O "sem juros" aqui é promessa de vitrine — quem cobra (ou não) o juro é a
 * conta do vendedor no Mercado Pago. Se os dois discordarem, o cliente vê o
 * valor verdadeiro no seletor de parcelas do checkout, que lê o juro real do
 * gateway. Manter os dois alinhados é responsabilidade de quem configura.
 */
function paymentText(max: number, interestFree: number): string {
  const base = "Pix, boleto ou cartão";
  if (max <= 1) return `${base} à vista`;
  if (interestFree >= max) return `${base} em até ${max}x sem juros`;
  if (interestFree >= 2) return `${base} em até ${max}x — ${interestFree}x sem juros`;
  return `${base} em até ${max}x`;
}

export function AnnouncementBar() {
  const { maxInstallments, interestFreeInstallments, freeShippingThreshold } =
    useStoreConfig();
  const [i, setI] = useState(0);

  const MESSAGES = useMemo(
    () => [
      {
        icon: Truck,
        text:
          freeShippingThreshold > 0
            ? `Frete grátis acima de ${formatBRL(freeShippingThreshold)}`
            : "Enviamos para todo o Brasil",
      },
      { icon: Gift, text: "Embrulho e cartão de presente por nossa conta" },
      { icon: CreditCard, text: paymentText(maxInstallments, interestFreeInstallments) },
      { icon: ShieldCheck, text: "Compra segura e protegida" },
    ],
    [maxInstallments, interestFreeInstallments, freeShippingThreshold],
  );

  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % MESSAGES.length), 3500);
    return () => clearInterval(id);
  }, [MESSAGES.length]);

  const Current = MESSAGES[i].icon;

  return (
    <div className="bg-champagne-500 text-linen-900">
      <div className="mx-auto max-w-7xl px-4 py-2 text-center text-[0.625rem] font-medium uppercase tracking-[0.16em]">
        {/* Desktop: mostra todas */}
        <div className="hidden items-center justify-center gap-10 sm:flex">
          {MESSAGES.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
              {text}
            </span>
          ))}
        </div>
        {/* Mobile: rotaciona */}
        <div className="flex items-center justify-center gap-2 sm:hidden">
          <Current className="h-3.5 w-3.5" strokeWidth={1.6} />
          {MESSAGES[i].text}
        </div>
      </div>
    </div>
  );
}
