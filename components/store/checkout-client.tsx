"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, QrCode, CreditCard, Barcode, Tag } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { formatBRL, formatCPF, isValidCPF, qualifiesForFreeShipping } from "@/lib/utils";
import { opcaoGratuita, precoCobrado } from "@/lib/shipping-options";
import { useStoreConfig } from "@/lib/store-config-context";
import { createCheckout, previewCoupon } from "@/app/(store)/checkout/actions";
import { MPCardForm, type CardFormHandle } from "@/components/store/mp-card-form";

type PaymentKind = "pix" | "card" | "boleto";

const PAYMENT_OPTIONS: { kind: PaymentKind; label: string; hint: string; Icon: typeof QrCode }[] = [
  { kind: "pix", label: "Pix", hint: "Aprovação na hora", Icon: QrCode },
  { kind: "card", label: "Cartão de crédito", hint: "Parcele sua compra", Icon: CreditCard },
  { kind: "boleto", label: "Boleto", hint: "Compensa em até 3 dias úteis", Icon: Barcode },
];

/** Script antifraude do Mercado Pago — melhora a taxa de aprovação. */
const DEVICE_SCRIPT = "https://www.mercadopago.com/v2/security.js";

interface Quote {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryTime: number;
}

export type CheckoutAccount = { name: string; email: string; phone: string };

export function CheckoutClient({ account }: { account: CheckoutAccount }) {
  const { maxInstallments, freeShippingThreshold } = useStoreConfig();
  const { items, subtotal, isReady, clear } = useCart();
  const router = useRouter();

  const [customer, setCustomer] = useState({
    name: account.name,
    email: account.email,
    phone: account.phone,
    document: "",
  });
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("pix");
  const cardRef = useRef<CardFormHandle>(null);
  const [addr, setAddr] = useState({
    cep: "", street: "", number: "", complement: "", district: "", city: "", state: "",
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [shipping, setShipping] = useState<Quote | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cupom. `applied` só existe depois que o SERVIDOR confirmou — o valor aqui é
  // exibição; o desconto que vale é o que `createCheckout` recalcular.
  // Presente: embrulho + cartão. Cortesia da casa, sem taxa.
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const input =
    "w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";

  // Carrega o fingerprint antifraude do Mercado Pago uma vez.
  useEffect(() => {
    if (document.querySelector(`script[src="${DEVICE_SCRIPT}"]`)) return;
    const s = document.createElement("script");
    s.src = DEVICE_SCRIPT;
    s.setAttribute("view", "checkout");
    s.async = true;
    document.body.appendChild(s);
  }, []);

  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setAddr((a) => ({
          ...a,
          street: d.logradouro || a.street,
          district: d.bairro || a.district,
          city: d.localidade || a.city,
          state: d.uf || a.state,
        }));
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingCep(false);
    }

    // Cota junto com a busca de endereço. Antes dependia de o cliente clicar em
    // "Calcular frete" — e quando a compra já tinha frete grátis não havia
    // motivo aparente para clicar, então ele seguia até o fim e só ali
    // descobria que faltava escolher. Pedido nenhum deveria depender disso.
    void calcFrete(clean);
  }

  /**
   * Cota o frete. Recebe o CEP por parâmetro porque também roda logo depois da
   * busca de endereço, quando o `addr` do state ainda é o de antes.
   */
  async function calcFrete(cepArg?: string) {
    const cep = cepArg ?? addr.cep;
    if (cep.replace(/\D/g, "").length !== 8) {
      setError("Informe um CEP válido.");
      return;
    }
    setError(null);
    // Trocou de CEP: a escolha anterior era para outro destino.
    setShipping(null);
    setLoadingFrete(true);
    try {
      const r = await fetch("/api/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep, items: items.map((i) => ({ id: i.productId, variantId: i.variantId, qty: i.qty })) }),
      });
      const d = await r.json();
      setQuotes(d.quotes ?? []);
      if (!d.quotes?.length) {
        setError("Frete a combinar para este CEP (integração em configuração).");
      }
    } catch {
      setError("Não foi possível calcular o frete agora.");
    } finally {
      setLoadingFrete(false);
    }
  }

  async function finalizar() {
    setError(null);
    if (!customer.name || !customer.email || !customer.phone) {
      setError("Preencha seus dados de contato.");
      return;
    }
    if (!isValidCPF(customer.document)) {
      setError("Informe um CPF válido — é exigido para emitir o pagamento.");
      return;
    }
    if (!addr.cep || !addr.street || !addr.number || !addr.city || !addr.state) {
      setError("Preencha o endereço de entrega.");
      return;
    }
    // Sem escolher transportadora não há pedido: dois pedidos reais foram
    // fechados assim, com frete R$ 0 e nenhum serviço — a loja pagou a entrega
    // e ainda ficou sem saber por quem despachar. Ter direito a frete grátis
    // não dispensa a escolha: o grátis zera o PREÇO de uma opção, mas alguém
    // precisa despachar, e é esse nome que vai na etiqueta.
    if (!shipping) {
      setError(
        quotes.length
          ? "Escolha uma opção de frete para continuar."
          : "Calcule o frete pelo seu CEP para continuar.",
      );
      return;
    }
    setSubmitting(true);

    // Cartão: tokeniza NO BROWSER. Os dados do cartão nunca chegam ao servidor.
    let card;
    if (paymentKind === "card") {
      card = (await cardRef.current?.createToken()) ?? undefined;
      if (!card) {
        setSubmitting(false);
        return; // o próprio formulário já exibiu o erro
      }
    }

    const res = await createCheckout({
      items: items.map((i) => ({ id: i.productId, variantId: i.variantId, qty: i.qty })),
      customer,
      address: addr,
      shipping: shipping ? { id: shipping.id, name: `${shipping.company} ${shipping.name}`, price: shipping.price } : null,
      couponCode: applied?.code ?? null,
      gift: isGift ? { isGift: true, message: giftMessage } : null,
      payment: {
        kind: paymentKind,
        card,
        deviceId: window.MP_DEVICE_SESSION_ID,
      },
    });
    if (!res.ok) {
      setError(res.error ?? "Erro ao finalizar.");
      setSubmitting(false);
      return;
    }
    clear();
    if (res.initPoint) {
      window.location.href = res.initPoint; // gateway com redirect
    } else {
      // Pix (QR code), boleto e cartão aprovado são exibidos na página do pedido
      router.push(`/pedido/${res.orderId}`);
    }
  }

  if (!isReady) {
    return <div className="mx-auto max-w-4xl px-6 py-24 text-center text-sm text-linen-600">Carregando…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl text-ink">Seu carrinho está vazio</h1>
        <p className="text-linen-700">Adicione produtos antes de finalizar a compra.</p>
      </div>
    );
  }

  // Mesma regra que `createCheckout` aplica no servidor. Se divergirem, o
  // cliente vê um total diferente do que é efetivamente cobrado — e o valor
  // enviado ao seletor de parcelas do cartão também sai errado.
  //
  // Nota: as regras promocionais de frete (Admin → Regras de frete) rodam só no
  // servidor, então um frete descontado por regra aparece aqui pelo valor cheio
  // e cai no valor certo no pedido. Erra para o lado de cobrar a mais na tela,
  // nunca a menos — o contrário seria prometer um preço que não se cumpre.
  const freeShipping = qualifiesForFreeShipping(subtotal, freeShippingThreshold) || !!applied?.freeShipping;
  // O grátis cobre uma opção só — a mais barata, que é o prazo padrão. Quem
  // quiser receber antes escolhe outra e paga por ela. Mesma função que o
  // servidor usa, para a tela não prometer um preço diferente do cobrado.
  const opcaoGratis = freeShipping ? opcaoGratuita(quotes) : null;
  const shippingCost = shipping ? precoCobrado(shipping, quotes, freeShipping) : 0;
  const discount = applied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount + shippingCost);

  async function aplicarCupom() {
    const code = couponInput.trim();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const res = await previewCoupon({
        code,
        items: items.map((i) => ({ id: i.productId, variantId: i.variantId, qty: i.qty })),
        email: customer.email,
        // O que está sendo cobrado, não o valor cheio da opção: um cupom
        // de frete grátis não tem o que descontar de um frete já zerado.
        shippingPrice: shippingCost,
      });
      if (!res.ok) {
        setApplied(null);
        setCouponError(res.error);
        return;
      }
      setApplied({ code: res.code, discount: res.discount, freeShipping: res.freeShipping });
      setCouponInput(res.code);
    } finally {
      setCheckingCoupon(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display rule mb-10 text-[clamp(2rem,4.5vw,3rem)] text-ink">Finalizar compra</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Identificação */}
          <div className="flex items-center gap-2.5 border border-champagne-300 bg-champagne-200/30 px-5 py-3.5 text-sm text-linen-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Comprando como <strong>{account.email}</strong>.
          </div>

          {/* Contato */}
          <section className="border border-line p-6">
            <h2 className="eyebrow mb-5">Seus dados</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>Nome completo</label>
                <input className={input} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </div>
              <div>
                <label className={label}>E-mail</label>
                <input type="email" className={input} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              </div>
              <div>
                <label className={label}>Telefone / WhatsApp</label>
                <input className={input} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
              <div>
                <label className={label}>CPF</label>
                <input
                  className={input}
                  value={customer.document}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  onChange={(e) => setCustomer({ ...customer, document: formatCPF(e.target.value) })}
                />
                <p className="mt-1 text-xs text-linen-500">
                  Exigido para emitir o pagamento e a etiqueta de envio.
                </p>
              </div>
            </div>
          </section>

          {/* Endereço */}
          <section className="border border-line p-6">
            <h2 className="eyebrow mb-5">Endereço de entrega</h2>
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className={label}>CEP {loadingCep && <span className="text-xs text-linen-500">buscando…</span>}</label>
                <input className={input} value={addr.cep}
                  onChange={(e) => setAddr({ ...addr, cep: e.target.value })}
                  onBlur={(e) => lookupCep(e.target.value)} />
              </div>
              <div className="sm:col-span-4">
                <label className={label}>Rua</label>
                <input className={input} value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Número</label>
                <input className={input} value={addr.number} onChange={(e) => setAddr({ ...addr, number: e.target.value })} />
              </div>
              <div className="sm:col-span-4">
                <label className={label}>Complemento</label>
                <input className={input} value={addr.complement} onChange={(e) => setAddr({ ...addr, complement: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <label className={label}>Bairro</label>
                <input className={input} value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Cidade</label>
                <input className={input} value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
              </div>
              <div className="sm:col-span-1">
                <label className={label}>UF</label>
                <input className={input} maxLength={2} value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
              </div>
            </div>

            <button onClick={() => calcFrete()} disabled={loadingFrete}
              className="mt-4 border border-line px-6 py-2.5 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-60">
              {loadingFrete ? "Calculando…" : quotes.length ? "Recalcular frete" : "Calcular frete"}
            </button>

            {quotes.length > 0 && (
              <div className="mt-4 space-y-2">
                {!shipping && (
                  <p className="text-sm text-linen-700">
                    Escolha como quer receber:
                  </p>
                )}
                {quotes.map((q) => {
                  const gratis = opcaoGratis?.id === q.id;
                  return (
                    <label
                      key={q.id}
                      className={`flex cursor-pointer items-center justify-between border p-3 ${shipping?.id === q.id ? "border-linen-900 bg-linen-100" : "border-line hover:border-linen-300"}`}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <input type="radio" name="frete" checked={shipping?.id === q.id} onChange={() => setShipping(q)} />
                        <span>
                          {q.company} {q.name} — até {q.deliveryTime} dias úteis
                          {gratis && (
                            <span className="ml-1 text-xs text-success">(prazo padrão)</span>
                          )}
                        </span>
                      </span>
                      {gratis ? (
                        <span className="flex items-center gap-2">
                          {/* O preço riscado mostra o tamanho do benefício —
                              sem ele "Grátis" é só uma palavra. */}
                          <span className="text-xs text-linen-500 line-through">
                            {formatBRL(q.price)}
                          </span>
                          <span className="font-semibold text-success">Grátis</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-ink">{formatBRL(q.price)}</span>
                      )}
                    </label>
                  );
                })}
                {opcaoGratis && (
                  <p className="text-xs text-linen-600">
                    Sua compra tem frete grátis na opção de prazo padrão.
                    Prefere outra transportadora? É só escolher — aí o frete
                    dela é cobrado.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Pagamento */}
          <section className="border border-line p-6">
            <h2 className="eyebrow mb-5">Pagamento</h2>

            <div className="grid gap-3 sm:grid-cols-3">
              {PAYMENT_OPTIONS.map(({ kind, label: optLabel, hint, Icon }) => (
                <label
                  key={kind}
                  className={`flex cursor-pointer flex-col gap-1 border p-3 transition-colors ${
                    paymentKind === kind ? "border-linen-900 bg-linen-100" : "border-line hover:border-linen-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pagamento"
                      className="accent-brand"
                      checked={paymentKind === kind}
                      onChange={() => { setPaymentKind(kind); setError(null); }}
                    />
                    <Icon className="h-4 w-4 text-champagne-600" strokeWidth={1.4} />
                    <span className="text-sm font-medium text-ink">{optLabel}</span>
                  </span>
                  <span className="pl-6 text-xs text-linen-600">{hint}</span>
                </label>
              ))}
            </div>

            <div className="mt-5">
              {paymentKind === "card" && (
                <MPCardForm
                  ref={cardRef}
                  amount={total}
                  document={customer.document}
                  maxInstallments={maxInstallments}
                  onError={setError}
                />
              )}
              {paymentKind === "pix" && (
                <p className="bg-linen-100 p-4 text-sm leading-relaxed text-linen-700">
                  Ao confirmar, mostramos o <strong>QR code</strong> e o código
                  copia-e-cola. O pedido é liberado assim que o Pix cair.
                </p>
              )}
              {paymentKind === "boleto" && (
                <p className="bg-linen-100 p-4 text-sm leading-relaxed text-linen-700">
                  Ao confirmar, geramos o <strong>boleto</strong> para você
                  imprimir ou copiar o código de barras. A compensação leva até
                  3 dias úteis.
                </p>
              )}
            </div>
          </section>

          {/* Presente */}
          <section className="border border-line p-6">
            <h2 className="eyebrow mb-4">Presente</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isGift}
                onChange={(e) => setIsGift(e.target.checked)}
                className="mt-1 h-4 w-4 accent-champagne-600"
              />
              <span>
                <span className="block text-sm text-ink">
                  Este pedido é um presente
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-linen-600">
                  Embrulhamos em papel seda com fita de cetim e deixamos a nota
                  fiscal fora da caixa, sem nenhum preço à vista. Sem custo.
                </span>
              </span>
            </label>

            {isGift && (
              <label className="mt-5 block">
                <span className="eyebrow">Mensagem do cartão (opcional)</span>
                <textarea
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value.slice(0, 240))}
                  rows={3}
                  placeholder="Escrevemos à mão no cartão que vai junto."
                  className="mt-2 w-full border border-line bg-transparent p-3 text-sm outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600"
                />
                <span className="mt-1 block text-right text-xs text-linen-500">
                  {giftMessage.length}/240
                </span>
              </label>
            )}
          </section>
        </div>

        {/* Resumo */}
        <div className="h-fit border border-line p-6">
          <h2 className="font-display mb-5 text-2xl text-ink">Resumo</h2>
          <div className="space-y-2 text-sm">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-linen-700">
                <span className="line-clamp-1">{i.qty}× {i.name}</span>
                <span>{formatBRL(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          {/* Cupom */}
          <div className="mt-4 border-t border-line pt-4">
            {applied ? (
              <div className="flex items-center justify-between bg-success/10 px-3 py-2">
                <div className="text-sm">
                  <p className="font-semibold text-success">
                    <Tag className="mr-1 inline h-3.5 w-3.5" />
                    {applied.code}
                  </p>
                  <p className="text-xs text-success">
                    {applied.freeShipping
                      ? "Frete grátis aplicado"
                      : `${formatBRL(applied.discount)} de desconto`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setApplied(null);
                    setCouponInput("");
                    setCouponError(null);
                  }}
                  className="text-xs text-linen-600 underline transition-colors hover:text-champagne-700"
                >
                  remover
                </button>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium text-linen-700">
                  Cupom de desconto
                </label>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void aplicarCupom();
                      }
                    }}
                    placeholder="SEUCUPOM"
                    className="w-full border border-linen-300 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-champagne-600"
                  />
                  <button
                    type="button"
                    onClick={aplicarCupom}
                    disabled={checkingCoupon || !couponInput.trim()}
                    className="shrink-0 border border-linen-300 px-4 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-50"
                  >
                    {checkingCoupon ? "…" : "Aplicar"}
                  </button>
                </div>
                {couponError && <p className="mt-1.5 text-xs text-danger">{couponError}</p>}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-linen-700"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Desconto</span>
                <span>−{formatBRL(discount)}</span>
              </div>
            )}
            {/* O resumo segue a OPÇÃO ESCOLHIDA, não o direito ao grátis: com
                o upgrade selecionado o frete é cobrado, e dizer "Grátis" aqui
                seria prometer um total que o pedido não cumpre. */}
            <div className="flex justify-between text-linen-700">
              <span>Frete</span>
              {!shipping ? (
                <span>—</span>
              ) : shippingCost === 0 ? (
                <span className="font-semibold text-success">Grátis</span>
              ) : (
                <span>{formatBRL(shippingCost)}</span>
              )}
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-lg font-bold text-ink"><span>Total</span><span>{formatBRL(total)}</span></div>
          </div>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <button onClick={finalizar} disabled={submitting}
            className="mt-7 w-full border border-linen-900 bg-linen-900 px-6 py-4 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60">
            {submitting
              ? "Processando…"
              : paymentKind === "pix"
                ? "Gerar Pix"
                : paymentKind === "boleto"
                  ? "Gerar boleto"
                  : "Pagar com cartão"}
          </button>
          <p className="mt-3 text-center text-xs text-linen-500">
            Pagamento seguro processado pelo Mercado Pago. Seus dados de cartão
            são enviados criptografados e não passam pela nossa loja.
          </p>
        </div>
      </div>
    </div>
  );
}
