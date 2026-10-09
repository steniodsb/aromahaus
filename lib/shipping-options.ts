/**
 * Qual opção de frete o "frete grátis" cobre.
 *
 * O frete grátis por valor de compra zerava TODAS as opções: quem batia o
 * limite podia escolher o SEDEX expresso e a loja pagava a diferença sem
 * saber. A promessa é entregar sem custo, não entregar no modo mais caro sem
 * custo.
 *
 * Então o grátis cobre UMA opção — a mais barata, que é o prazo padrão. As
 * outras continuam disponíveis e continuam cobradas: quem quer receber antes
 * paga por isso.
 *
 * Esta regra vive aqui, sozinha, porque precisa valer igual na vitrine e no
 * servidor. Já aconteceu de carrinho e checkout discordarem sobre frete
 * grátis, e o cliente ver uma promessa que o pedido não cumpria.
 */

export interface OpcaoFrete {
  id: number | string;
  price: number;
  deliveryTime: number;
}

/**
 * A opção coberta pelo frete grátis: a mais barata.
 *
 * Empate no preço decide pelo prazo menor — entre duas opções que custam o
 * mesmo, entregar o cliente mais rápido não custa nada à loja.
 */
export function opcaoGratuita<T extends OpcaoFrete>(opcoes: T[]): T | null {
  if (!opcoes.length) return null;
  return opcoes.reduce((melhor, o) => {
    if (o.price !== melhor.price) return o.price < melhor.price ? o : melhor;
    return o.deliveryTime < melhor.deliveryTime ? o : melhor;
  });
}

/**
 * Quanto o cliente paga pela opção escolhida.
 *
 * `temGratis` é o direito ao frete grátis (limite de valor ou cupom). Ele
 * zera só a opção padrão; o upgrade sai pelo preço cheio.
 */
export function precoCobrado<T extends OpcaoFrete>(
  escolhida: T,
  opcoes: T[],
  temGratis: boolean,
): number {
  if (!temGratis) return escolhida.price;
  const gratis = opcaoGratuita(opcoes);
  // Sem lista de opções para comparar, o direito ao grátis vale pela escolha
  // feita — negar o benefício por falta de contexto seria pior.
  if (!gratis) return 0;
  return String(gratis.id) === String(escolhida.id) ? 0 : escolhida.price;
}
