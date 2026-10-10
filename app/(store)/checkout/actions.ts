"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveGateway } from "@/lib/payments";
import {
  createDirectPayment,
  type BoletoDetails,
  type PaymentKind,
  type PixDetails,
} from "@/lib/payments/mercadopago-transparent";
import { getShippingOrigin } from "@/lib/store";
import { calculateShipping } from "@/lib/melhorenvio";
import {
  sendOrderReceivedEmail,
  sendOrderPixEmail,
  sendOrderBoletoEmail,
  sendPaymentFailedEmail,
} from "@/lib/email";
import { isValidCPF, qualifiesForFreeShipping } from "@/lib/utils";
import { precoCobrado } from "@/lib/shipping-options";
import { validateCoupon, redeemCoupon } from "@/lib/coupons";
import { applyShippingRules } from "@/lib/shipping-rules";
import { resolveSellablesDetailed, resolveSellables, sellableLabel } from "@/lib/sellables";

/** Teto do embrulho de presente, para a mensagem não virar carta. */
const GIFT_MESSAGE_MAX = 240;

interface CheckoutInput {
  items: { id: string; variantId?: string | null; qty: number }[];
  customer: { name: string; email: string; phone: string; document: string };
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  };
  shipping: { id?: number; name: string; price: number } | null;
  /** Código digitado pelo cliente. Revalidado aqui — o preview não vale nada. */
  couponCode?: string | null;
  /** Embrulho e cartão. A loja não cobra por isso — é cortesia da marca. */
  gift?: { isGift: boolean; message?: string | null } | null;
  /** Checkout transparente. `null` cai no fluxo de redirect/WhatsApp. */
  payment: {
    kind: PaymentKind;
    card?: {
      token: string;
      installments: number;
      paymentMethodId: string;
      issuerId?: string;
    };
    deviceId?: string;
  } | null;
}

export interface CheckoutResult {
  ok: boolean;
  orderId?: string;
  /** Redirect (Checkout Pro / C6) — só quando não há checkout transparente. */
  initPoint?: string | null;
  pix?: PixDetails;
  boleto?: BoletoDetails;
  /** true quando o cartão já foi aprovado na hora. */
  paid?: boolean;
  error?: string;
  /**
   * Chaves de carrinho que saíram do ar. O browser conhece os nomes e
   * consegue dizer ao cliente QUAL item remover — o servidor só tem o id de
   * um produto que não existe mais.
   */
  unavailable?: string[];
}

export async function createCheckout(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const admin = createAdminClient();

  if (!input.items.length) return { ok: false, error: "Carrinho vazio" };

  // CPF é exigido pelo Mercado Pago em Pix e boleto — validado no servidor
  // porque nunca se confia na validação do browser.
  const document = (input.customer.document ?? "").replace(/\D/g, "");
  if (input.payment && !isValidCPF(document)) {
    return { ok: false, error: "CPF inválido." };
  }

  // Normalizado porque o e-mail é a chave que liga um pedido de convidado à
  // conta do cliente depois (ver `claimGuestOrders`).
  const customerEmail = input.customer.email.trim().toLowerCase();

  // Compra só com conta. A página já redireciona o visitante para o login;
  // esta checagem é a que vale, porque a action é chamável direto.
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return { ok: false, error: "Entre na sua conta para finalizar a compra." };
  }

  // Recalcula preços no servidor (segurança — nunca confiar no cliente).
  // Com variantes de tamanho, preço e peso podem vir do produto OU da
  // variante; `resolveSellables` é quem sabe de onde.
  // Item inativo, variante apagada e produto esgotado são descartados aqui.
  // Antes o pedido seguia com o que sobrou: o cliente via "3 itens, R$ 500"
  // no resumo, confirmava, e o pedido nascia com 2 — descobria na caixa.
  const { lines: lineItems, indisponiveis } = await resolveSellablesDetailed(
    input.items,
  );

  if (indisponiveis.length) {
    return {
      ok: false,
      unavailable: indisponiveis,
      error:
        indisponiveis.length === input.items.length
          ? "Nenhum item do seu carrinho está disponível agora."
          : "Um item do seu carrinho esgotou ou saiu do ar.",
    };
  }

  if (!lineItems.length) return { ok: false, error: "Carrinho vazio" };

  const subtotal = lineItems.reduce((s, it) => s + it.unit_price * it.qty, 0);

  // Peso total, só se TODO item tiver peso cadastrado. Um `null` no meio faz o
  // total virar null de propósito: regra com limite de peso não pode rodar em
  // cima de um peso que a loja não conhece.
  const weightG = lineItems.some((it) => it.weight_g == null)
    ? null
    : lineItems.reduce((s, it) => s + (it.weight_g ?? 0) * it.qty, 0);

  // ── Frete ────────────────────────────────────────────────────────────────
  // Três coisas podem zerar/reduzir o frete, nesta ordem:
  //   1. o limite global de frete grátis (Configurações → Frete);
  //   2. uma regra promocional (Admin → Frete);
  //   3. um cupom do tipo "frete grátis".
  // O browser já barra, mas a action é chamável direto. Sem transportadora o
  // pedido nasce impossível de despachar: a etiqueta do Melhor Envio exige o
  // serviço, e sem ele o botão "Gerar etiqueta" trava no pedido.
  if (!input.shipping) {
    return { ok: false, error: "Escolha uma opção de frete antes de finalizar." };
  }

  const origin = await getShippingOrigin();

  // Recota AQUI em vez de aceitar o preço que veio do browser.
  //
  // Todo o resto desta action já recalcula preço no servidor, menos o frete —
  // que chegava pronto do cliente. Agora isso deixou de ser só inconsistência:
  // com o grátis cobrindo apenas a opção mais barata, o servidor precisa
  // conhecer a lista inteira para saber QUAL é a mais barata. Sem recotar, quem
  // escolhesse o expresso poderia se declarar a opção padrão.
  const cepDestino = (input.address?.cep ?? "").replace(/\D/g, "");
  const cotacoes = await calculateShipping(
    cepDestino,
    lineItems.map((it) => ({
      width_cm: it.width_cm,
      height_cm: it.height_cm,
      length_cm: it.length_cm,
      weight_g: it.weight_g ?? 600,
      price: it.unit_price,
      qty: it.qty,
    })),
    origin.from_cep,
  );

  // A opção escolhida tem que existir na cotação de agora. Se não existe, o
  // preço do browser está velho ou inventado — e cobrar por ele é errar o
  // valor do pedido em dinheiro real.
  const escolhida = cotacoes.find(
    (c) => String(c.id) === String(input.shipping!.id),
  );
  if (!escolhida) {
    return {
      ok: false,
      error: cotacoes.length
        ? "A opção de frete escolhida não está mais disponível. Recalcule o frete e escolha de novo."
        : "Não foi possível confirmar o frete agora. Tente novamente em instantes.",
    };
  }

  const temFreteGratis = qualifiesForFreeShipping(
    subtotal,
    origin.free_shipping_threshold,
  );

  // O grátis cobre só a opção mais barata; upgrade sai pelo preço cheio.
  let shippingCost = precoCobrado(escolhida, cotacoes, temFreteGratis);
  let appliedRuleId: string | null = null;

  // Regras promocionais só entram sobre o que ainda está sendo cobrado.
  if (shippingCost > 0) {
    const ruled = await applyShippingRules({
      subtotal,
      shippingCost,
      state: input.address?.state ?? null,
      weightG,
      // Escolheu algo além da opção mais barata: regra de frete grátis não
      // cobre o upgrade.
      isUpgrade: precoCobrado(escolhida, cotacoes, true) > 0,
    });
    shippingCost = ruled.price;
    appliedRuleId = ruled.rule?.id ?? null;
  }

  // ── Cupom ────────────────────────────────────────────────────────────────
  // Revalidado do zero: o carrinho pode ter mudado depois do preview, e o
  // código chega do browser como qualquer outro dado não confiável.
  let discount = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;

  if (input.couponCode?.trim()) {
    const res = await validateCoupon(input.couponCode, {
      subtotal,
      shippingCost,
      email: customerEmail || null,
      userId: user.id,
    });
    if (!res.ok) return { ok: false, error: res.error };

    discount = res.applied.discount;
    couponId = res.applied.coupon.id;
    couponCode = res.applied.coupon.code;
    // Cupom de frete grátis segue a mesma regra do limite por valor: cobre a
    // opção padrão, não o upgrade. É a mesma promessa — entregar sem custo, não
    // entregar no modo mais caro sem custo.
    //
    // O `Math.min` é o detalhe que faltava: quando uma regra promocional já
    // tinha baixado o frete (R$ 20 → R$ 10), aplicar o cupom devolvia o preço
    // CHEIO da cotação. O cliente usava um cupom chamado "frete grátis", a
    // tela dizia "frete grátis aplicado" e ele pagava MAIS do que pagaria sem
    // o cupom. Cupom nunca pode encarecer.
    if (res.applied.freeShipping) {
      shippingCost = Math.min(shippingCost, precoCobrado(escolhida, cotacoes, true));
    }
  }

  const total = Math.max(0, subtotal - discount + shippingCost);

  // ── Presente ─────────────────────────────────────────────────────────────
  // A mensagem é impressa num cartão pela equipe, então chega cortada no
  // tamanho que cabe nele — e sem HTML, que não significa nada no papel.
  const isGift = Boolean(input.gift?.isGift);
  const giftMessage = isGift
    ? (input.gift?.message ?? "").replace(/<[^>]*>/g, "").trim().slice(0, GIFT_MESSAGE_MAX) || null
    : null;

  // Gateway ativo (Mercado Pago, C6, …). `null` = nenhum configurado → WhatsApp.
  const gateway = getActiveGateway();

  // Cria o pedido (status pending)
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      status: "pending",
      user_id: user.id,
      customer_name: input.customer.name,
      customer_email: customerEmail,
      customer_phone: input.customer.phone,
      customer_document: document || null,
      shipping_address: input.address,
      shipping_service: `${escolhida.company} ${escolhida.name}`,
      shipping_service_id: String(escolhida.id),
      subtotal,
      shipping_cost: shippingCost,
      discount,
      total,
      coupon_id: couponId,
      coupon_code: couponCode,
      shipping_rule_id: appliedRuleId,
      payment_method: gateway?.id ?? "whatsapp",
      payment_method_kind: input.payment?.kind ?? null,
      is_gift: isGift,
      gift_message: giftMessage,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: "Não foi possível criar o pedido" };
  }

  // Itens do pedido
  const orderItems = lineItems.map((it) => ({
    order_id: order.id,
    product_id: it.product_id,
    variant_id: it.variant_id,
    variant_label: it.variant_label,
    // Cópia do nome COM o tamanho: o pedido precisa continuar legível mesmo
    // se o produto for renomeado ou a variante apagada.
    name_snapshot: sellableLabel(it),
    unit_price: it.unit_price,
    qty: it.qty,
  }));
  await admin.from("order_items").insert(orderItems);

  // Contabiliza o cupom. Depois do pedido existir, porque o resgate referencia
  // o `order_id`; e sem `await` travar o checkout se a contagem falhar.
  if (couponId) {
    void redeemCoupon({
      couponId,
      orderId: order.id,
      userId: user.id,
      email: customerEmail || null,
      amount: discount,
    });
  }

  // E-mail de "pedido recebido" (não bloqueia o checkout se falhar)
  void sendOrderReceivedEmail(
    {
      id: order.id,
      customer_name: input.customer.name,
      customer_email: customerEmail,
      subtotal,
      shipping_cost: shippingCost,
      total,
      shipping_service: input.shipping?.name ?? null,
    },
    orderItems.map((it) => ({ name_snapshot: it.name_snapshot, unit_price: it.unit_price, qty: it.qty })),
  ).catch(() => {});

  // ── Checkout transparente (Mercado Pago) ────────────────────────────────
  if (input.payment && gateway?.id === "mercadopago") {
    const result = await createDirectPayment({
      orderId: order.id,
      amount: total,
      description: `Pedido #${order.id.slice(0, 8)} — ${lineItems.length} item(ns)`,
      kind: input.payment.kind,
      payer: {
        name: input.customer.name,
        email: customerEmail,
        document,
      },
      address: input.address,
      card: input.payment.card,
      deviceId: input.payment.deviceId,
    });

    const details = result.pix ?? result.boleto ?? null;

    await admin
      .from("orders")
      .update({
        payment_id: result.paymentId ?? null,
        payment_status: result.rawStatus || null,
        payment_details: details,
        // Cartão aprovado já marca o pedido como pago; o webhook confirma depois
        // (e é idempotente, então não há efeito duplicado).
        ...(result.status === "paid" ? { status: "paid" } : {}),
      })
      .eq("id", order.id);

    // E-mails do meio de pagamento. Não bloqueiam o checkout: o cliente já vê
    // o QR code / boleto na tela, o e-mail é a cópia que sobrevive a fechar a aba.
    const emailOrder = {
      id: order.id,
      customer_name: input.customer.name,
      customer_email: customerEmail,
      subtotal,
      shipping_cost: shippingCost,
      total,
      shipping_service: input.shipping?.name ?? null,
    };

    if (result.pix) {
      void sendOrderPixEmail(emailOrder, result.pix).catch(() => {});
    } else if (result.boleto) {
      void sendOrderBoletoEmail(emailOrder, result.boleto).catch(() => {});
    } else if (!result.ok && input.payment.kind === "card") {
      // Só no cartão: Pix/boleto que falham nem chegam a ser uma recusa de
      // pagamento — o cliente vê o erro na tela e simplesmente tenta de novo.
      void sendPaymentFailedEmail(emailOrder, result.error).catch(() => {});
    }

    if (!result.ok) {
      return { ok: false, orderId: order.id, error: result.error };
    }

    return {
      ok: true,
      orderId: order.id,
      pix: result.pix,
      boleto: result.boleto,
      paid: result.status === "paid",
    };
  }

  // ── Fluxo com redirect (C6) ou fallback WhatsApp ────────────────────────
  const charge = await gateway?.createCharge({
    orderId: order.id,
    items: lineItems.map((it) => ({
      title: sellableLabel(it),
      quantity: it.qty,
      unit_price: it.unit_price,
    })),
    shippingCost,
    payer: {
      name: input.customer.name,
      email: customerEmail,
      phone: input.customer.phone,
      document,
    },
  });

  return { ok: true, orderId: order.id, initPoint: charge?.checkoutUrl ?? null };
}

/**
 * Pré-visualiza um cupom para o checkout, sem criar pedido.
 *
 * O resultado é só para MOSTRAR ao cliente. Quem decide de verdade é o
 * `createCheckout`, que revalida o mesmo cupom contra o carrinho recalculado no
 * servidor — se alguém forjar a resposta desta action, o pedido sai sem o
 * desconto e o cliente vê o erro na hora de finalizar.
 */
export async function previewCoupon(args: {
  code: string;
  items: { id: string; variantId?: string | null; qty: number }[];
  email: string;
  shippingPrice: number;
}): Promise<
  | { ok: true; code: string; discount: number; freeShipping: boolean; description: string | null }
  | { ok: false; error: string }
> {
  if (!args.items?.length) return { ok: false, error: "Carrinho vazio." };

  // Subtotal recalculado do banco — o preço que o browser mandaria não vale.
  // Mesma resolução do checkout, para o cupom nunca ser calculado sobre um
  // subtotal diferente do que vai ser cobrado.
  const lines = await resolveSellables(args.items);
  const subtotal = lines.reduce((s, it) => s + it.unit_price * it.qty, 0);

  if (subtotal <= 0) return { ok: false, error: "Carrinho vazio." };

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const res = await validateCoupon(args.code, {
    subtotal,
    shippingCost: Number(args.shippingPrice) || 0,
    email: args.email ?? null,
    userId: user?.id ?? null,
  });

  if (!res.ok) return { ok: false, error: res.error };

  return {
    ok: true,
    code: res.applied.coupon.code,
    discount: res.applied.discount,
    freeShipping: res.applied.freeShipping,
    description: res.applied.coupon.description,
  };
}
