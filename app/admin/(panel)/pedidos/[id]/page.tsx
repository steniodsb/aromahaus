import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Truck,
  User,
  MapPin,
  CreditCard,
  ExternalLink,
  Ticket,
  Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatCPF, dataHoraBR } from "@/lib/utils";
import { updateOrder } from "@/app/admin/(panel)/pedidos/actions";
import { LabelButton } from "@/components/admin/label-button";
import { CopyButton } from "@/components/admin/copy-button";
import { RefundButton } from "@/components/admin/refund-button";
import { OrderEdit } from "@/components/admin/order-edit";
import { ShippingPicker } from "@/components/admin/shipping-picker";

const STATUSES = ["pending", "paid", "shipped", "delivered", "canceled", "refunded"];
const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando", paid: "Pago", shipped: "Enviado",
  delivered: "Entregue", canceled: "Cancelado", refunded: "Reembolsado",
};
const STATUS_COR: Record<string, string> = {
  pending: "bg-warning/15 text-amber-800",
  paid: "bg-success/15 text-success",
  shipped: "bg-blue-100 text-lilac-600",
  delivered: "bg-emerald-100 text-emerald-700",
  canceled: "bg-linen-200 text-linen-600",
  refunded: "bg-purple-100 text-purple-700",
};

const MEIO_LABEL: Record<string, string> = {
  pix: "Pix", card: "Cartão de crédito", boleto: "Boleto",
};

/** Tradução dos status do Mercado Pago — "pending" cru não diz nada ao operador. */
const PAGAMENTO_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  approved: "Aprovado",
  authorized: "Autorizado (não capturado)",
  in_process: "Em análise",
  in_mediation: "Em disputa",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Estornado pelo banco",
};

export default async function AdminOrderDetail(
  props: PageProps<"/admin/pedidos/[id]">,
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  // Imagem e slug vêm do produto; `name_snapshot` no item preserva o nome de
  // quando a compra aconteceu, mesmo que o produto seja renomeado depois.
  const productIds = (items ?? []).map((i) => i.product_id).filter(Boolean);
  const { data: produtos } = productIds.length
    ? await supabase.from("products").select("id, slug, images").in("id", productIds)
    : { data: [] };

  const addr = order.shipping_address as Record<string, string> | null;
  const enderecoTexto = addr
    ? [
        `${addr.street}, ${addr.number}${addr.complement ? ` — ${addr.complement}` : ""}`,
        `${addr.district} — ${addr.city}/${addr.state}`,
        `CEP ${addr.cep}`,
      ].join("\n")
    : "";

  const card = "rounded border border-linen-200 bg-linen-50 p-5";
  const linha = "flex justify-between gap-4 py-1 text-sm";
  const rotulo = "mb-1 text-xs font-medium uppercase tracking-wide text-linen-500";

  const comEtiqueta = !!order.melhorenvio_order_id;

  return (
    <div>
      <Link href="/admin/pedidos" className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl text-ink">Pedido #{order.id.slice(0, 8)}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COR[order.status] ?? "bg-linen-200 text-linen-600"}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
        <span className="text-sm text-linen-600">feito em {dataHoraBR(order.created_at)}</span>
        <Link
          href={`/pedido/${order.id}`}
          target="_blank"
          className="ml-auto inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700"
        >
          Ver como o cliente vê <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna larga: o PEDIDO — o que foi comprado, para quem, e como sai.
            O seletor de frete precisa de largura para listar as cotações, e
            fica logo abaixo do CEP que gerou a consulta. */}
        <div className="space-y-4 lg:col-span-2">
          <div className={card}>
            <h2 className="mb-3 font-semibold text-ink">Itens</h2>
            <div className="divide-y divide-linen-100">
              {(items ?? []).map((it) => {
                const p = produtos?.find((x) => x.id === it.product_id);
                return (
                  <div key={it.id} className="flex items-center gap-3 py-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-linen-200 bg-linen-100">
                      {p?.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {p?.slug ? (
                        <Link href={`/produto/${p.slug}`} target="_blank" className="text-sm font-medium text-ink hover:text-champagne-700">
                          {it.name_snapshot}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-ink">{it.name_snapshot}</span>
                      )}
                      <p className="text-xs text-linen-600">
                        {formatBRL(Number(it.unit_price))} × {it.qty}
                        {!p && " · produto removido do catálogo"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-ink">
                      {formatBRL(Number(it.unit_price) * it.qty)}
                    </span>
                  </div>
                );
              })}
              {(items ?? []).length === 0 && (
                <p className="py-3 text-sm text-linen-600">Sem itens.</p>
              )}
            </div>

            <div className="mt-4 space-y-1 border-t border-linen-200 pt-4">
              <div className={`${linha} text-linen-600`}>
                <span>Subtotal</span><span>{formatBRL(Number(order.subtotal))}</span>
              </div>
              {/* Sem esta linha, um total abaixo do esperado vira mistério na
                  hora de conferir o pedido. */}
              {Number(order.discount) > 0 && (
                <div className={`${linha} text-success`}>
                  <span className="flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5" />
                    Desconto
                    {order.coupon_code && <span className="font-mono text-xs">({order.coupon_code})</span>}
                  </span>
                  <span>−{formatBRL(Number(order.discount))}</span>
                </div>
              )}
              <div className={`${linha} text-linen-600`}>
                <span>
                  Frete
                  {order.shipping_service && (
                    <span className="ml-1 text-xs text-linen-500">({order.shipping_service})</span>
                  )}
                  {order.shipping_rule_id && (
                    <span className="ml-1 text-xs text-success">· regra promocional</span>
                  )}
                </span>
                <span>{formatBRL(Number(order.shipping_cost))}</span>
              </div>
              <div className={`${linha} border-t border-linen-200 pt-2 text-base font-bold text-ink`}>
                <span>Total</span><span>{formatBRL(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {/* Cliente e entrega no mesmo card porque "Corrigir dados" edita os
              dois. O botão vivia dentro de Entrega e abria um formulário com
              e-mail e CPF — dados que estavam em outro card, do outro lado da
              tela. */}
          <div className={card}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <User className="h-4 w-4" /> Cliente e entrega
              </h2>
              <span className="ml-auto">
                <OrderEdit
                  orderId={order.id}
                  nome={order.customer_name ?? ""}
                  email={order.customer_email ?? ""}
                  telefone={order.customer_phone ?? ""}
                  documento={order.customer_document ?? ""}
                  endereco={addr ?? {}}
                  temEtiqueta={comEtiqueta}
                />
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className={rotulo}>Contato</p>
                <p className="text-sm font-medium text-linen-800">{order.customer_name ?? "—"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-linen-600">
                  <a href={`mailto:${order.customer_email}`} className="truncate hover:text-champagne-700">
                    {order.customer_email}
                  </a>
                  <CopyButton value={order.customer_email ?? ""} label="Copiar e-mail" />
                </p>
                {order.customer_phone && (
                  <p className="text-sm text-linen-600">
                    <a
                      href={`https://wa.me/55${String(order.customer_phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-champagne-700"
                    >
                      {order.customer_phone}
                    </a>
                  </p>
                )}
                {/* CPF é o que o Melhor Envio exige na etiqueta. Some da tela e
                    ninguém sabe se o pedido tem — por isso a falta é dita, não
                    apenas omitida. */}
                <p className="mt-0.5 text-sm">
                  {order.customer_document ? (
                    <span className="text-linen-600">CPF {formatCPF(order.customer_document)}</span>
                  ) : (
                    <span className="text-warning">
                      Sem CPF — a etiqueta do Melhor Envio exige
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs text-linen-500">
                  {order.user_id ? "Cliente com conta na loja" : "Comprou como convidado"}
                </p>
              </div>

              {order.is_gift && (
                /* Em destaque e antes do endereço de propósito: quem separa o
                   pedido precisa ver que é presente ANTES de lacrar a caixa.
                   Descobrir depois significa reabrir — ou mandar com a nota
                   fiscal e o preço à vista para quem recebe. */
                <div className="border-l-2 border-champagne-500 bg-champagne-200/35 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-champagne-700">
                    <Gift className="h-3.5 w-3.5" /> Embrulhar para presente
                  </p>
                  <p className="mt-1.5 text-xs text-linen-600">
                    Papel seda com fita e nota fiscal FORA da caixa.
                  </p>
                  {order.gift_message ? (
                    <>
                      <p className="mt-3 text-[0.625rem] uppercase tracking-[0.12em] text-linen-600">
                        Mensagem do cartão
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm italic text-linen-800">
                        “{order.gift_message}”
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-linen-600">Sem mensagem no cartão.</p>
                  )}
                </div>
              )}

              <div>
                <p className={`${rotulo} flex items-center gap-1.5`}>
                  <MapPin className="h-3.5 w-3.5" /> Endereço
                  {addr && <CopyButton value={enderecoTexto} label="Copiar endereço" />}
                </p>
                {addr ? (
                  <div className="text-sm text-linen-700">
                    <p>{addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ""}</p>
                    <p>{addr.district} — {addr.city}/{addr.state}</p>
                    <p className="text-linen-600">CEP {addr.cep}</p>
                  </div>
                ) : (
                  <p className="text-sm text-warning">
                    Pedido sem endereço — não há como cotar frete nem despachar.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
              <Truck className="h-4 w-4" /> Envio
            </h2>
            <p className="text-sm text-linen-600">
              Transportadora:{" "}
              <span className="text-ink">{order.shipping_service ?? "ainda não definida"}</span>
            </p>
            {/* O rastreio aparece aqui só quando veio da etiqueta: aí é dado de
                leitura. Digitado à mão ele mora no campo de Situação — o mesmo
                valor não deve ter dois lugares para editar. */}
            {comEtiqueta && order.tracking_code && (
              <p className="flex items-center gap-1 text-sm text-linen-600">
                Rastreio: <span className="font-mono text-xs text-ink">{order.tracking_code}</span>
                <CopyButton value={order.tracking_code} label="Copiar rastreio" />
              </p>
            )}

            {/* Sem transportadora a etiqueta nem pode ser tentada — o seletor
                vem antes do botão para o caminho ficar óbvio. Com uma já
                definida ele encolhe num "Trocar", porque trocar acontece: a
                transportadora sai do ar, fica sem coleta, ou o cliente pede
                mais rápido. Só some depois da etiqueta comprada, aí o pedido
                não pode mais divergir do papel impresso. */}
            {!comEtiqueta && (
              <ShippingPicker
                orderId={order.id}
                jaPago={["paid", "shipped", "delivered"].includes(order.status)}
                servicoAtual={order.shipping_service}
              />
            )}

            {comEtiqueta ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-success">Etiqueta gerada ✓</p>
                {order.melhorenvio_label_url && (
                  <a href={order.melhorenvio_label_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-champagne-600 px-3 py-2 text-sm font-semibold text-champagne-700 hover:bg-champagne-600 hover:text-white">
                    <FileText className="h-4 w-4" /> Abrir etiqueta (PDF)
                  </a>
                )}
              </div>
            ) : order.shipping_service_id ? (
              <LabelButton orderId={order.id} status={order.status} />
            ) : (
              // Serviço definido à mão: não existe cotação para comprar, então
              // o botão de etiqueta não aparece. Dizer por quê evita a busca
              // pelo botão que sumiu.
              order.shipping_service && (
                <p className="mt-3 rounded-lg bg-linen-100 px-3 py-2 text-xs text-linen-600">
                  Transportadora informada manualmente — sem etiqueta do Melhor
                  Envio. Despache por fora e cole o rastreio em Situação.
                </p>
              )
            )}
          </div>
        </div>

        {/* Coluna estreita: o que se FAZ com o pedido — mudar a situação e
            mexer no dinheiro. */}
        <div className="space-y-4">
          <form action={updateOrder} className={card}>
            <input type="hidden" name="id" value={order.id} />
            <h2 className="mb-3 font-semibold text-ink">Situação</h2>
            <label className="mb-1 block text-sm font-medium text-linen-700">Status</label>
            <select name="status" defaultValue={order.status} className="mb-4 w-full rounded-lg border border-linen-300 px-3 py-2">
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>

            <label className="mb-1 block text-sm font-medium text-linen-700">Código de rastreio</label>
            <input
              name="tracking_code"
              defaultValue={order.tracking_code ?? ""}
              readOnly={comEtiqueta}
              className="mb-1 w-full rounded-lg border border-linen-300 px-3 py-2 read-only:bg-linen-100 read-only:text-linen-600"
            />
            <p className="mb-4 text-xs text-linen-500">
              {comEtiqueta
                ? "Veio da etiqueta do Melhor Envio."
                : "Preencha se despachou por fora do Melhor Envio."}
            </p>

            {/* Nota interna: some da vista do cliente. É onde o combinado por
                WhatsApp para de viver só no WhatsApp. */}
            <label className="mb-1 block text-sm font-medium text-linen-700">
              Nota interna
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={order.notes ?? ""}
              placeholder="Cliente pediu para trocar o endereço…"
              className="mb-1 w-full rounded-lg border border-linen-300 px-3 py-2 text-sm"
            />
            <p className="mb-4 text-xs text-linen-500">Só você vê. Não vai em e-mail nenhum.</p>

            <button className="w-full rounded-lg bg-champagne-600 py-2 font-semibold text-white hover:bg-champagne-700">
              Salvar
            </button>
            <p className="mt-2 text-xs text-linen-500">Salvar dispara o e-mail de atualização para o cliente.</p>
          </form>

          <div className={card}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
              <CreditCard className="h-4 w-4" /> Pagamento
            </h2>
            <div className="space-y-1 text-sm">
              <p className="text-linen-600">
                Meio:{" "}
                <span className="text-ink">
                  {MEIO_LABEL[order.payment_method_kind ?? ""] ?? order.payment_method ?? "—"}
                </span>
              </p>
              <p className="text-linen-600">
                Situação:{" "}
                <span className="text-ink">
                  {PAGAMENTO_LABEL[order.payment_status ?? ""] ?? order.payment_status ?? "—"}
                </span>
              </p>
              {order.payment_id && (
                <p className="flex items-center gap-1 text-linen-600">
                  ID: <span className="font-mono text-xs text-ink">{order.payment_id}</span>
                  <CopyButton value={String(order.payment_id)} label="Copiar ID do pagamento" />
                </p>
              )}
            </div>
            <RefundButton
              orderId={order.id}
              total={Number(order.total)}
              status={order.status}
            />

            {order.payment_id && order.payment_method === "mercadopago" && (
              <a
                href={`https://www.mercadopago.com.br/activities/detail/${order.payment_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-linen-600 hover:text-champagne-700"
              >
                Abrir no Mercado Pago <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
