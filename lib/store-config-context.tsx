"use client";

import { createContext, useContext } from "react";

/**
 * Configuração de vitrine da loja, lida do banco (`settings`) uma única vez no
 * layout e distribuída para os componentes de cliente.
 *
 * Existe para que carrinho, card de produto, checkout e barra de avisos leiam
 * TODOS o mesmo valor. Antes cada um usava uma constante hardcoded em
 * `lib/config.ts` (já removido) que não batia com o que o admin configurava — a vitrine
 * prometia frete grátis acima de R$500 e o checkout cobrava o frete assim mesmo.
 */
export interface StoreConfig {
  /** Máximo de parcelas anunciado no cartão. */
  maxInstallments: number;
  /** Até quantas parcelas a loja anuncia como "sem juros" (só texto de vitrine). */
  interestFreeInstallments: number;
  /** Subtotal a partir do qual o frete sai grátis. 0 = desativado. */
  freeShippingThreshold: number;
}

/**
 * Padrões usados só se algum componente for renderizado fora do provider.
 * `freeShippingThreshold: 0` é deliberado: sem informação, a loja não promete
 * frete grátis — errar para o lado de não prometer é o único lado seguro.
 */
const DEFAULTS: StoreConfig = {
  maxInstallments: 12,
  interestFreeInstallments: 2,
  freeShippingThreshold: 0,
};

const StoreConfigContext = createContext<StoreConfig>(DEFAULTS);

export function StoreConfigProvider({
  value,
  children,
}: {
  value: StoreConfig;
  children: React.ReactNode;
}) {
  return (
    <StoreConfigContext.Provider value={value}>
      {children}
    </StoreConfigContext.Provider>
  );
}

export function useStoreConfig(): StoreConfig {
  return useContext(StoreConfigContext);
}
