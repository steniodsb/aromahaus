import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, whatsappLink } from "@/lib/utils";
import { PixPayment, BoletoPayment } from "@/components/store/payment-details";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false },
};

type Tone = "done" | "wait" | "stop";

const STATUS: Record<
  string,
  { label: string; title: string; lead: string; paid: boolean; tone: Tone }
> = {
  pending: {
    label: "Aguardando pagamento",
    title: "Pedido recebido",
    lead: "Falta só o pagamento para a gente começar a separar o seu pedido.",
    paid: false,
    tone: "wait",
  },
  paid: {
    label: "Pagamento confirmado",
    title: "Pagamento confirmado",
    lead: "Recebemos o seu pagamento. Agora é com a gente.",
    paid: true,
    tone: "done",
  },
  shipped: {
    label: "Pedido enviado",
    title: "Pedido a caminho",
    lead: "Seu pedido saiu da nossa casa e já está com a transportadora.",
    paid: true,
    tone: "done",
  },
  delivered: {
    label: "Pedido entregue",
    title: "Pedido entregue",
    lead: "Seu pedido foi entregue. Esperamos que a fragrância acompanhe bem a sua casa.",
    paid: true,
    tone: "done",
  },
  canceled: {
    label: "Pedido cancelado",
    title: "Pedido cancelado",
    lead: "Este pedido foi cancelado e não será enviado.",
    paid: false,
    tone: "stop",
  },
  refunded: {
    label: "Pedido reembolsado",
    title: "Pedido reembolsado",
    lead: "O valor deste pedido foi devolvido pelo mesmo meio de pagamento.",
    paid: false,
    tone: "stop",
  },
};

const TONE_CLASS: Record<Tone, string> = {
  done: "border-success/40 text-success",
  wait: "border-champagne-500 text-champagne-700",
  stop: "border-line text-linen-700",
};

const NEXT_STEPS: Record<string, string[]> = {
  pending: [
    "Conclua o pagamento pelos dados abaixo. Pix é confirmado em instantes; boleto leva até 3 dias úteis para compensar.",
    "Com o pagamento confirmado, enviamos um e-mail de confirmação e começamos a separar e embalar o pedido.",
    "Quando o pedido sair, mandamos o código de rastreio por e-mail.",
  ],
  paid: [
    "Enviamos um e-mail de confirmação com o resumo do pedido.",
    "Separamos e embalamos tudo com cuidado. O prazo de entrega é o da opção de frete escolhida no checkout.",
    "Quando o pedido sair, mandamos o código de rastreio por e-mail.",
  ],
  shipped: [
    "O código de rastreio foi enviado ao seu e-mail. Use-o no site da transportadora para acompanhar a entrega.",
    "Confira se haverá alguém para receber. Se houver qualquer problema com a entrega, fale com a gente.",
  ],
};

export default async function OrderConfirmationPage(
  props: PageProps<"/pedido/[id]">,
) {
  const { id } = await props.params;
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (!order) notFound();

  // Quem pode ver este pedido.
  //
  // Compra sem cadastro não tem dono: o link com o id É a credencial, e é o
  // único jeito de o cliente voltar ao Pix que acabou de gerar. Mas quando o
  // pedido TEM dono, o link deixa de bastar — a página mostra os itens, o
  // total e o código de pagamento, e antes qualquer pessoa com o id via
  // tudo. Ids são UUID, difíceis de adivinhar, mas vazam: ficam no
  // histórico do navegador, no print que o cliente manda no WhatsApp e no
  // Referer de qualquer imagem de terceiro na página.
  if (order.user_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id !== order.user_id) {
      const { data: perfil } = user
        ? await admin.from("profiles").select("is_admin").eq("id", user.id).single()
        : { data: null };
      if (!perfil?.is_admin) notFound();
    }
  }

  const { data: items } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  const st = STATUS[order.status] ?? STATUS.pending;
  const steps = NEXT_STEPS[order.status];
  const pagarWhats = whatsappLink(
    `Olá! Quero finalizar o pagamento do pedido #${order.id.slice(0, 8)}.`,
  );
  const awaitingPayment = !st.paid && order.status === "pending";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <header className="text-center">
        <p className="eyebrow">Pedido</p>
        <h1 className="font-display-xl rule mx-auto mt-4 text-[clamp(2rem,4.5vw,3rem)] text-ink">
          {st.title}
        </h1>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-linen-700">
          {st.lead}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="numeral text-sm tracking-[0.08em] text-ink">
            Nº {order.id.slice(0, 8).toUpperCase()}
          </span>
          <span
            className={`border px-3 py-1 text-[0.6875rem] uppercase tracking-[0.16em] ${TONE_CLASS[st.tone]}`}
          >
            {st.label}
          </span>
        </div>
      </header>

      {/* Checkout transparente: QR code do Pix / boleto gerados no pedido */}
      {awaitingPayment && order.payment_method_kind === "pix" && (
        <PixPayment pix={order.payment_details ?? {}} />
      )}
      {awaitingPayment && order.payment_method_kind === "boleto" && (
        <BoletoPayment boleto={order.payment_details ?? {}} />
      )}

      {/* Fallback: sem meio de pagamento gerado, combina pelo WhatsApp */}
      {awaitingPayment && !order.payment_details && (
        <div className="mt-10 border border-line p-6 text-sm text-linen-700">
          <p className="mb-4 leading-relaxed">
            Caso ainda não tenha concluído o pagamento, fale com a gente para
            finalizar.
          </p>
          {pagarWhats ? (
            <a
              href={pagarWhats}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.4} /> Pagar pelo WhatsApp
            </a>
          ) : (
            // Este é o caminho de pagamento quando não há gateway. Sem
            // WhatsApp cadastrado ele não pode sumir: vira a página de
            // contato, senão o cliente fica com um pedido sem como pagar.
            <Link href="/contato" className="inline-flex items-center gap-2 border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink">
              Falar com a gente para pagar
            </Link>
          )}
        </div>
      )}

      <section className="mt-10 border border-line p-6">
        <h2 className="eyebrow mb-5">Resumo do pedido</h2>
        <ul className="divide-y divide-line">
          {(items ?? []).map((it) => (
            <li key={it.id} className="flex items-baseline justify-between gap-6 py-3 text-sm">
              <span className="text-linen-700">
                <span className="numeral text-ink">{it.qty}×</span> {it.name_snapshot}
              </span>
              <span className="numeral shrink-0 text-ink">
                {formatBRL(Number(it.unit_price) * it.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-4 text-sm text-linen-700">
          <span>Frete</span>
          <span className="numeral text-ink">{formatBRL(Number(order.shipping_cost))}</span>
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm text-linen-700">Total</span>
          <span className="numeral text-2xl text-ink">{formatBRL(Number(order.total))}</span>
        </div>
      </section>

      {order.is_gift ? (
        <div className="mt-6 flex gap-3 border-l-2 border-champagne-500 bg-champagne-200/30 px-5 py-4 text-sm leading-relaxed text-linen-700">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-champagne-700" strokeWidth={1.4} />
          <p>
            Vai embrulhado para presente, com a nota fiscal fora da caixa.
            {order.gift_message
              ? " O cartão sai escrito à mão com a sua mensagem."
              : ""}
          </p>
        </div>
      ) : null}

      {steps ? (
        <section className="mt-6 border border-line p-6">
          <h2 className="eyebrow mb-5">Próximos passos</h2>
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-4 text-sm leading-relaxed text-linen-700">
                <span className="numeral w-5 shrink-0 text-champagne-700">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-10 text-center">
        <Link
          href="/produtos"
          className="border border-line px-6 py-2.5 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
