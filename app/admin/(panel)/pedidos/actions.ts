"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShippingOrigin } from "@/lib/store";
import { createShipmentForOrder, calculateShipping } from "@/lib/melhorenvio";
import { refundPayment } from "@/lib/payments/mercadopago-transparent";
import type { FormResult } from "@/lib/admin-form";
import { log } from "@/lib/activity";
import { isValidCPF } from "@/lib/utils";
import {
  sendOrderShippedEmail,
  sendOrderStatusEmail,
  sendOrderPaidEmail,
} from "@/lib/email";

/**
 * Atualiza status + rastreio de um pedido e dispara o e-mail de
 * atualização adequado (enviado / entregue / cancelado / reembolsado).
 * Também ajusta o estoque quando o status muda manualmente.
 */
export async function updateOrder(formData: FormData) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const tracking_code = (formData.get("tracking_code") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const { data: prev } = await admin.from("orders").select("*").eq("id", id).single();
  if (!prev) throw new Error("Pedido não encontrado");

  const { error } = await admin
    .from("orders")
    .update({ status, tracking_code, notes })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const order = { ...prev, status, tracking_code, notes };
  const statusChanged = prev.status !== status;

  // Ajuste de estoque em mudanças manuais
  if (statusChanged) {
    if (status === "paid" && !prev.stock_decremented) {
      await admin.rpc("decrement_order_stock", { p_order_id: id });
    }
    if ((status === "canceled" || status === "refunded") && prev.stock_decremented) {
      await admin.rpc("restore_order_stock", { p_order_id: id });
    }
  }

  // E-mails de atualização. O cliente só é avisado quando há novidade para ele:
  //  - o status mudou (comparado com o valor que estava no banco ANTES do
  //    update acima), ou
  //  - o pedido está "enviado" e o código de rastreio mudou (inclusive quando
  //    foi preenchido pela primeira vez ou corrigido).
  // Salvar só a nota interna não cai em nenhum dos dois: antes, qualquer save
  // disparava e-mail sempre que o de "pago"/"enviado" ainda não tinha saído.
  const trackingChanged = (prev.tracking_code ?? null) !== tracking_code;
  const avisarRastreio = status === "shipped" && trackingChanged && !!tracking_code;
  try {
    if (!statusChanged && !avisarRastreio) {
      /* nada que o cliente precise saber */
    } else if (status === "paid" && !prev.paid_email_sent) {
      const { data: items } = await admin
        .from("order_items")
        .select("name_snapshot, unit_price, qty")
        .eq("order_id", id);
      await sendOrderPaidEmail(order, items ?? []);
      await admin.from("orders").update({ paid_email_sent: true, last_status_emailed: "paid" }).eq("id", id);
    } else if (status === "shipped") {
      await sendOrderShippedEmail(order);
      await admin.from("orders").update({ shipped_email_sent: true, last_status_emailed: "shipped" }).eq("id", id);
    } else if (
      (status === "delivered" || status === "canceled" || status === "refunded") &&
      prev.last_status_emailed !== status
    ) {
      await sendOrderStatusEmail(order, status);
      await admin.from("orders").update({ last_status_emailed: status }).eq("id", id);
    }
  } catch {
    /* e-mail não deve travar o admin */
  }

  if (statusChanged) {
    void log({
      actorId: user.id,
      actorEmail: user.email,
      action: "mudou status",
      entity: "pedido",
      entityId: id,
      entityLabel: `#${id.slice(0, 8)}`,
      meta: { de: prev.status, para: status },
    });
  }

  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
}

/**
 * Gera a etiqueta do pedido no Melhor Envio (carrinho → compra → geração →
 * impressão), salva id/rastreio/URL no pedido e avisa o cliente por e-mail.
 */
export async function gerarEtiqueta(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get("id") as string;

  const { data: order } = await admin.from("orders").select("*").eq("id", id).single();
  if (!order) return { error: "Pedido não encontrado." };

  if (order.melhorenvio_order_id) {
    // Já existe — apenas revalida (evita cobrança duplicada de etiqueta)
    revalidatePath(`/admin/pedidos/${id}`);
    return;
  }

  // Gerar etiqueta COMPRA de verdade com o saldo do Melhor Envio. Fazer isso
  // num pedido que ninguém pagou é dinheiro da loja indo embora.
  if (order.status !== "paid" && order.status !== "shipped") {
    return {
      error: `Este pedido está como "${order.status}". Gerar etiqueta compra o frete com o saldo do Melhor Envio — confirme o pagamento antes.`,
    };
  }

  const { data: items } = await admin
    .from("order_items")
    .select("product_id, qty, unit_price, name_snapshot")
    .eq("order_id", id);

  const ids = (items ?? []).map((i) => i.product_id).filter(Boolean) as string[];
  const { data: products } = await admin
    .from("products")
    .select("id, weight_g, width_cm, height_cm, length_cm")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const shippingItems = (items ?? []).map((it) => {
    const p = products?.find((x) => x.id === it.product_id);
    return {
      width_cm: Number(p?.width_cm) || 11,
      height_cm: Number(p?.height_cm) || 2,
      length_cm: Number(p?.length_cm) || 16,
      weight_g: Number(p?.weight_g) || 300,
      price: Number(it.unit_price) || 0,
      qty: it.qty,
    };
  });

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const origin = await getShippingOrigin();

  const result = await createShipmentForOrder(origin, {
    serviceId: Number(order.shipping_service_id) || 0,
    to: {
      name: order.customer_name ?? "Cliente",
      email: order.customer_email ?? undefined,
      phone: order.customer_phone ?? undefined,
      // CPF do destinatário: o Melhor Envio exige em produção, e a loja já
      // coleta desde a migração 0004. Antes ficava de fora e a etiqueta
      // falhava sem ninguém entender por quê.
      document: order.customer_document ?? undefined,
      address: addr.street ?? "",
      number: addr.number ?? "S/N",
      complement: addr.complement,
      district: addr.district ?? "",
      city: addr.city ?? "",
      state_abbr: addr.state ?? "",
      postal_code: addr.cep ?? "",
    },
    items: shippingItems,
    totalValue: Number(order.subtotal) || 0,
    // Declaração de conteúdo com os itens reais do pedido — é o que vai
    // impresso na etiqueta. Com `name_snapshot`, o nome é o de quando a
    // compra aconteceu, mesmo que o produto tenha sido renomeado depois.
    products: (items ?? []).map((it) => ({
      name: it.name_snapshot,
      quantity: it.qty,
      unitary_value: Number(it.unit_price) || 0,
    })),
  });

  if (!result.ok) {
    console.error(`[etiqueta] pedido ${id}:`, result.error);
    return { error: result.error ?? "Falha ao gerar etiqueta." };
  }

  await admin
    .from("orders")
    .update({
      melhorenvio_order_id: result.melhorenvioOrderId ?? null,
      tracking_code: result.trackingCode ?? order.tracking_code ?? null,
      melhorenvio_label_url: result.labelUrl ?? null,
      status: order.status === "paid" ? "shipped" : order.status,
    })
    .eq("id", id);

  // Avisa o cliente que saiu para envio (com rastreio, se disponível)
  if (!order.shipped_email_sent) {
    try {
      await sendOrderShippedEmail({ ...order, tracking_code: result.trackingCode ?? order.tracking_code });
      await admin.from("orders").update({ shipped_email_sent: true, last_status_emailed: "shipped" }).eq("id", id);
    } catch {
      /* ignore */
    }
  }

  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
}

/**
 * Estorna o pagamento no Mercado Pago e reflete no pedido.
 *
 * Antes, marcar "Reembolsado" no seletor só trocava o texto no banco e devolvia
 * o estoque — o dinheiro continuava com a loja e os dois sistemas divergiam.
 *
 * A ordem importa: primeiro o gateway, depois o banco. Se invertesse, um erro
 * do MP deixaria o pedido marcado como reembolsado sem estorno nenhum, que é
 * exatamente a mentira que este código existe para acabar.
 */
export async function estornarPedido(formData: FormData): Promise<FormResult> {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const parcial = formData.get("amount");

  const { data: order } = await admin.from("orders").select("*").eq("id", id).single();
  if (!order) return { error: "Pedido não encontrado." };
  if (!order.payment_id) {
    return { error: "Este pedido não tem pagamento registrado no Mercado Pago." };
  }
  if (order.status === "refunded") {
    return { error: "Este pedido já consta como reembolsado." };
  }
  if (!["paid", "shipped", "delivered"].includes(order.status)) {
    return { error: `Só dá para estornar pedido pago. Este está como "${order.status}".` };
  }

  let valor: number | undefined;
  if (parcial != null && String(parcial).trim() !== "") {
    valor = Number(String(parcial).replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) return { error: "Valor de estorno inválido." };
    if (valor > Number(order.total)) {
      return { error: `O estorno não pode passar do total do pedido (${order.total}).` };
    }
  }

  const res = await refundPayment(String(order.payment_id), valor);
  if (!res.ok) return { error: res.error ?? "Falha ao estornar." };

  // Estorno parcial não cancela o pedido: a mercadoria pode ter ido em parte.
  // Só o total muda o status e devolve o estoque.
  const total = valor == null || valor >= Number(order.total);

  await admin
    .from("orders")
    .update({
      status: total ? "refunded" : order.status,
      notes: [order.notes, `Estorno de R$ ${(res.amount ?? valor ?? order.total).toFixed(2)} em ${new Date().toLocaleString("pt-BR")}`]
        .filter(Boolean)
        .join("\n"),
    })
    .eq("id", id);

  if (total && order.stock_decremented) {
    await admin.rpc("restore_order_stock", { p_order_id: id });
  }

  if (total) {
    try {
      await sendOrderStatusEmail({ ...order, status: "refunded" }, "refunded");
      await admin.from("orders").update({ last_status_emailed: "refunded" }).eq("id", id);
    } catch {
      /* e-mail não deve travar o estorno, que já aconteceu no gateway */
    }
  }

  void log({
    actorId: user.id,
    actorEmail: user.email,
    action: total ? "estornou (total)" : "estornou (parcial)",
    entity: "pedido",
    entityId: id,
    entityLabel: `#${id.slice(0, 8)}`,
    meta: { valor: res.amount ?? valor ?? Number(order.total), payment_id: order.payment_id },
  });

  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
  return undefined;
}

/**
 * Corrige dados de contato e endereço de um pedido já criado.
 *
 * PED-02. Cliente erra o CEP ou digita o telefone faltando um dígito toda
 * semana; até agora a única saída era mexer no banco.
 *
 * Não mexe em item nem em valor: alterar preço de pedido já pago faria o
 * total divergir do que o gateway cobrou, e essa divergência é pior do que a
 * limitação.
 */
export async function atualizarDadosPedido(formData: FormData): Promise<FormResult> {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const { data: order } = await admin.from("orders").select("*").eq("id", id).single();
  if (!order) return { error: "Pedido não encontrado." };

  const nome = ((formData.get("customer_name") as string) || "").trim();
  if (!nome) return { error: "O nome do cliente é obrigatório." };

  const cep = ((formData.get("cep") as string) || "").replace(/\D/g, "");
  if (cep && cep.length !== 8) return { error: "CEP precisa ter 8 dígitos." };

  // CPF do destinatário: vai na etiqueta do Melhor Envio, que o exige em
  // produção. Pode ficar vazio (pedido antigo), mas se preenchido tem que ser
  // válido — um CPF errado só falha lá na hora de gerar a etiqueta.
  const documento = ((formData.get("customer_document") as string) || "").replace(/\D/g, "");
  if (documento && !isValidCPF(documento)) {
    return { error: "CPF inválido. Confira os dígitos." };
  }

  const endereco = {
    cep,
    street: ((formData.get("street") as string) || "").trim(),
    number: ((formData.get("number") as string) || "").trim(),
    complement: ((formData.get("complement") as string) || "").trim(),
    district: ((formData.get("district") as string) || "").trim(),
    city: ((formData.get("city") as string) || "").trim(),
    state: ((formData.get("state") as string) || "").trim().toUpperCase().slice(0, 2),
  };

  const antes = (order.shipping_address ?? {}) as Record<string, string>;
  const mudouEndereco = JSON.stringify(antes) !== JSON.stringify(endereco);

  const { error } = await admin
    .from("orders")
    .update({
      customer_name: nome,
      customer_email: ((formData.get("customer_email") as string) || "").trim() || null,
      customer_phone: ((formData.get("customer_phone") as string) || "").trim() || null,
      customer_document: documento || null,
      shipping_address: endereco,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  void log({
    actorId: user.id,
    actorEmail: user.email,
    action: "corrigiu dados do pedido",
    entity: "pedido",
    entityId: id,
    entityLabel: `#${id.slice(0, 8)}`,
    meta: mudouEndereco
      ? { cep_antes: antes.cep ?? "—", cep_depois: endereco.cep || "—" }
      : { campo: "contato" },
  });

  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
  return undefined;
}

export interface CotacaoFrete {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryTime: number;
}

/**
 * Cota o frete de um pedido JÁ criado, a partir do endereço e dos itens dele.
 *
 * Existe porque o checkout deixava fechar pedido sem escolher transportadora —
 * dois pedidos reais nasceram assim, com `shipping_service` nulo, e o botão
 * "Gerar etiqueta" trava sem esse campo. O checkout foi corrigido, mas os
 * pedidos antigos precisam de conserto.
 */
export async function cotarFretePedido(
  orderId: string,
): Promise<{ ok: true; cotacoes: CotacaoFrete[] } | { ok: false; error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("shipping_address")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const cep = (addr.cep ?? "").replace(/\D/g, "");
  if (cep.length !== 8) {
    return { ok: false, error: "O pedido não tem um CEP válido. Corrija o endereço primeiro." };
  }

  const { data: items } = await admin
    .from("order_items")
    .select("product_id, qty, unit_price")
    .eq("order_id", orderId);

  const ids = (items ?? []).map((i) => i.product_id).filter(Boolean) as string[];
  const { data: produtos } = await admin
    .from("products")
    .select("id, weight_g, width_cm, height_cm, length_cm")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  // Mesmos padrões do cálculo no checkout, para a cotação aqui não divergir
  // do que o cliente teria visto.
  const shippingItems = (items ?? []).map((it) => {
    const p = produtos?.find((x) => x.id === it.product_id);
    return {
      width_cm: Number(p?.width_cm) || 11,
      height_cm: Number(p?.height_cm) || 2,
      length_cm: Number(p?.length_cm) || 16,
      weight_g: Number(p?.weight_g) || 300,
      price: Number(it.unit_price) || 0,
      qty: it.qty,
    };
  });

  const origin = await getShippingOrigin();
  const cotacoes = await calculateShipping(cep, shippingItems, origin.from_cep);

  if (!cotacoes.length) {
    return { ok: false, error: "O Melhor Envio não devolveu opções para este CEP." };
  }
  return { ok: true, cotacoes: cotacoes as CotacaoFrete[] };
}

/**
 * Grava a transportadora de um pedido — cotada no Melhor Envio ou digitada.
 *
 * O modo manual existe porque a cotação pode simplesmente não vir: token
 * ausente, CEP que o Melhor Envio não atende, API fora do ar. Sem ele o
 * pedido fica travado num estado que ninguém consegue destravar pela tela.
 * Nesse modo `shipping_service_id` fica NULO de propósito — é o id de uma
 * cotação real do Melhor Envio, e inventar um faria a compra de etiqueta
 * falhar depois, longe daqui, sem explicação. Sem id, a tela não oferece
 * etiqueta: quem escolheu transportadora por fora despacha por fora e cola o
 * rastreio à mão.
 *
 * O valor do frete só entra no total se o pedido ainda NÃO foi pago. Num
 * pedido pago, mexer no total faria ele divergir do que o gateway cobrou — e
 * essa divergência é pior do que registrar o frete como absorvido. Nesse caso
 * o custo real fica anotado na nota interna.
 */
export async function definirFretePedido(formData: FormData): Promise<FormResult> {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const manual = formData.get("manual") === "1";
  const serviceId = String(formData.get("service_id") ?? "");
  const nome = String(formData.get("service_name") ?? "").trim();
  const preco = Number(formData.get("price"));

  if (!nome) return { error: "Diga qual é a transportadora." };
  if (!manual && !serviceId) return { error: "Escolha uma transportadora." };
  if (!Number.isFinite(preco) || preco < 0) return { error: "Valor de frete inválido." };

  const { data: order } = await admin.from("orders").select("*").eq("id", id).single();
  if (!order) return { error: "Pedido não encontrado." };

  // Etiqueta já comprada: trocar o serviço aqui deixaria a etiqueta impressa
  // e o pedido dizendo coisas diferentes.
  if (order.melhorenvio_order_id) {
    return {
      error:
        "A etiqueta deste pedido já foi comprada — trocar a transportadora agora deixaria o pedido divergente da etiqueta impressa.",
    };
  }

  const jaPago = ["paid", "shipped", "delivered"].includes(order.status);

  const patch: Record<string, unknown> = {
    shipping_service: nome,
    shipping_service_id: manual ? null : serviceId,
  };

  if (jaPago) {
    patch.notes = [
      order.notes,
      `Frete definido depois do pagamento: ${nome}${manual ? " (informado manualmente)" : ""} — custo real R$ ${preco.toFixed(2)}, absorvido pela loja (o total cobrado não muda).`,
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    patch.shipping_cost = preco;
    patch.total = Math.max(0, Number(order.subtotal) - Number(order.discount ?? 0) + preco);
  }

  const { error } = await admin.from("orders").update(patch).eq("id", id);
  if (error) return { error: error.message };

  void log({
    actorId: user.id,
    actorEmail: user.email,
    action: "definiu frete do pedido",
    entity: "pedido",
    entityId: id,
    entityLabel: `#${id.slice(0, 8)}`,
    meta: { servico: nome, preco, cobrado: !jaPago, manual },
  });

  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
  return undefined;
}

/**
 * Arquiva ou desarquiva pedidos.
 *
 * Arquivar só tira da lista padrão — não apaga nada e é reversível. É o que
 * resolve o caso comum (pedido de teste sujando a lista) sem destruir
 * registro.
 */
export async function arquivarPedidos(
  ids: string[],
  arquivar: boolean,
): Promise<FormResult> {
  const { user } = await requireAdmin();
  if (!ids.length) return { error: "Selecione ao menos um pedido." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update({ archived_at: arquivar ? new Date().toISOString() : null })
    .in("id", ids);
  if (error) return { error: error.message };

  void log({
    actorId: user.id,
    actorEmail: user.email,
    action: arquivar ? "arquivou pedidos" : "desarquivou pedidos",
    entity: "pedido",
    meta: { quantidade: ids.length },
  });

  revalidatePath("/admin/pedidos");
  return undefined;
}

/**
 * Exclui pedidos DE VEZ.
 *
 * Só pedidos que nunca foram pagos. Apagar um pedido pago destrói registro
 * financeiro — o dinheiro entrou, existe no Mercado Pago, e some do lado da
 * loja; a conciliação depois não fecha e não há como reconstruir. Para esses,
 * arquivar resolve o incômodo sem o estrago.
 *
 * Pedido com etiqueta comprada também fica de fora: houve gasto real de
 * saldo, e o rastreio precisa continuar acessível para o cliente.
 */
export async function excluirPedidos(ids: string[]): Promise<FormResult> {
  const { user } = await requireAdmin();
  if (!ids.length) return { error: "Selecione ao menos um pedido." };

  const admin = createAdminClient();
  const { data: alvos } = await admin
    .from("orders")
    .select("id, status, melhorenvio_order_id, total")
    .in("id", ids);

  const protegidos = (alvos ?? []).filter(
    (o) =>
      ["paid", "shipped", "delivered", "refunded"].includes(o.status) ||
      o.melhorenvio_order_id,
  );

  if (protegidos.length) {
    return {
      error:
        protegidos.length === ids.length
          ? "Pedido pago ou com etiqueta não pode ser excluído — isso apagaria registro financeiro. Use Arquivar."
          : `${protegidos.length} do lote está pago ou tem etiqueta e não pode ser excluído. Desmarque e tente de novo, ou use Arquivar.`,
    };
  }

  // `order_items` e `coupon_redemptions` têm ON DELETE CASCADE, então somem
  // junto sem deixar linha órfã.
  const { error } = await admin.from("orders").delete().in("id", ids);
  if (error) return { error: error.message };

  void log({
    actorId: user.id,
    actorEmail: user.email,
    action: "excluiu pedidos",
    entity: "pedido",
    meta: { quantidade: ids.length, ids: ids.map((i) => i.slice(0, 8)).join(", ") },
  });

  revalidatePath("/admin/pedidos");
  return undefined;
}
