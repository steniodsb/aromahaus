"use client";

import { Truck, CreditCard, Gift, Tag } from "lucide-react";
import { useStoreConfig } from "@/lib/store-config-context";
import { formatBRL } from "@/lib/utils";

/**
 * Barra de vantagens, logo abaixo do banner.
 *
 * Fala de OFERTA, não de valores da marca: cupom, frete grátis, parcelamento e
 * desconto à vista. É a informação que decide a compra e que o cliente procura
 * antes de abrir o primeiro produto — por isso vem antes da vitrine.
 *
 * Os números saem da configuração da loja, nunca de texto fixo: prometer na
 * home um frete grátis que o checkout não dá é o jeito mais rápido de perder
 * a venda no último passo.
 */
export function TrustStrip() {
  const { maxInstallments, interestFreeInstallments, freeShippingThreshold } =
    useStoreConfig();

  const parcelas =
    interestFreeInstallments >= 2
      ? `Em até ${interestFreeInstallments}x sem juros`
      : `Em até ${maxInstallments}x no cartão`;

  const itens = [
    {
      icon: Tag,
      title: "5% OFF na primeira compra",
      sub: "Cupom PRIMEIRAHAUS",
    },
    {
      icon: Truck,
      title: "Frete grátis",
      sub:
        freeShippingThreshold > 0
          ? `Em pedidos acima de ${formatBRL(freeShippingThreshold)}`
          : "Consulte no checkout",
    },
    { icon: CreditCard, title: "Parcele sua compra", sub: parcelas },
    { icon: Gift, title: "Embrulho de presente", sub: "Com cartão escrito à mão" },
  ];

  return (
    <section className="border-b border-line bg-linen-100">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-7 px-6 py-7 lg:grid-cols-4 lg:divide-x lg:divide-linen-300">
        {itens.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-3.5 lg:justify-center lg:px-4">
            <Icon
              className="h-6 w-6 shrink-0 text-champagne-600"
              strokeWidth={1.2}
            />
            <div className="min-w-0">
              <p className="text-[0.8125rem] leading-tight text-ink">{title}</p>
              <p className="mt-1 text-xs leading-snug text-linen-600">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
