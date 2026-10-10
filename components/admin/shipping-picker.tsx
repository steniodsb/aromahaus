"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, AlertTriangle, Pencil } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import {
  cotarFretePedido,
  definirFretePedido,
  type CotacaoFrete,
} from "@/app/admin/(panel)/pedidos/actions";

/**
 * Escolha (ou troca) da transportadora de um pedido.
 *
 * Nasceu para consertar pedidos que o checkout deixou fechar sem frete — sem
 * `shipping_service_id` o botão "Gerar etiqueta" trava. O checkout foi
 * corrigido, mas isto continua valendo por dois motivos: pedidos antigos ainda
 * existem, e a transportadora escolhida no checkout às vezes precisa mudar
 * (caiu do site, ficou sem coleta, o cliente pediu mais rápido).
 *
 * Dois caminhos, porque a cotação pode não vir:
 *  - **Cotar** — pergunta ao Melhor Envio e lista as opções reais. É o único
 *    caminho que rende etiqueta, porque a compra precisa do id da cotação.
 *  - **Manual** — digitar nome e valor. Serve quando o Melhor Envio não
 *    responde, não atende o CEP ou o envio vai por fora (transportadora
 *    própria, retirada, motoboy). Aqui não há etiqueta para comprar: o
 *    rastreio entra à mão no campo ao lado.
 */
export function ShippingPicker({
  orderId,
  jaPago,
  servicoAtual,
}: {
  orderId: string;
  /** Pedido pago: o total não pode mudar, então o frete entra como absorvido. */
  jaPago: boolean;
  /** Nome do serviço já gravado, se houver. Muda o texto de aviso para troca. */
  servicoAtual?: string | null;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(!servicoAtual);
  const [modo, setModo] = useState<"cotar" | "manual">("cotar");
  const [cotacoes, setCotacoes] = useState<CotacaoFrete[] | null>(null);
  const [escolhida, setEscolhida] = useState<CotacaoFrete | null>(null);
  const [nomeManual, setNomeManual] = useState("");
  const [precoManual, setPrecoManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cota sozinho ao abrir num pedido sem transportadora.
  //
  // O botão "Cotar frete para este endereço" era trabalho manual sem decisão:
  // o CEP do cliente já está no pedido, a resposta é sempre a mesma, e não
  // havia motivo para escolher a hora. Quem abre esse card já quer ver as
  // opções. Na troca não roda: ali o pedido já tem transportadora e a cotação
  // é uma consulta paga em tempo, não a primeira coisa a fazer.
  const jaCotou = useRef(false);
  useEffect(() => {
    if (servicoAtual || jaCotou.current) return;
    jaCotou.current = true;
    void cotar();
    // Só na montagem: recotar a cada render dispararia chamadas em sequência.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cotar() {
    setBusy(true);
    setError(null);
    const res = await cotarFretePedido(orderId);
    if (!res.ok) {
      setError(res.error);
      // Cotação falhou: o manual deixa de ser alternativa e vira o caminho.
      setModo("manual");
    } else {
      setCotacoes(res.cotacoes);
      setEscolhida(res.cotacoes[0] ?? null);
    }
    setBusy(false);
  }

  async function salvar(manual: boolean) {
    const nome = manual ? nomeManual.trim() : escolhida && `${escolhida.company} ${escolhida.name}`;
    if (!nome) {
      setError("Diga qual é a transportadora.");
      return;
    }

    // Vírgula é como se digita preço aqui; sem isso "23,90" viraria NaN.
    const preco = manual ? Number(precoManual.replace(",", ".")) : escolhida!.price;
    if (!Number.isFinite(preco) || preco < 0) {
      setError("Valor de frete inválido.");
      return;
    }

    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("id", orderId);
    fd.append("service_name", nome);
    fd.append("price", String(preco));
    if (manual) fd.append("manual", "1");
    else fd.append("service_id", String(escolhida!.id));

    const res = await definirFretePedido(fd);
    if (res?.error) setError(res.error);
    else {
      setAberto(false);
      router.refresh();
    }
    setBusy(false);
  }

  // Já tem transportadora e ninguém pediu para trocar: só o atalho.
  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-champagne-700 hover:underline"
      >
        <Pencil className="h-3 w-3" /> Trocar transportadora
      </button>
    );
  }

  const trocando = Boolean(servicoAtual);
  const precoValido = Number(precoManual.replace(",", "."));

  return (
    <div
      className={`mt-3 rounded border p-3 ${
        trocando ? "border-linen-300 bg-linen-100" : "border-warning/40 bg-warning/10"
      }`}
    >
      {trocando ? (
        <p className="mb-2 text-xs text-linen-600">
          Trocando a transportadora de <strong>{servicoAtual}</strong>.
        </p>
      ) : (
        <p className="mb-2 flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Este pedido foi fechado sem transportadora. Escolha uma para conseguir
          gerar a etiqueta.
        </p>
      )}

      {/* As duas vias, sempre visíveis: quem já sabe que vai despachar por fora
          não precisa esperar a cotação falhar para descobrir o caminho. */}
      <div className="mb-3 flex gap-1 rounded bg-linen-50 p-1 text-xs">
        {(
          [
            ["cotar", "Cotar no Melhor Envio"],
            ["manual", "Informar manualmente"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => {
              setModo(valor);
              setError(null);
            }}
            className={`flex-1 rounded px-2 py-1.5 transition-colors ${
              modo === valor
                ? "bg-linen-900 text-linen-50"
                : "text-linen-600 hover:text-champagne-700"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {modo === "cotar" && (
        <>
          {!cotacoes &&
            (busy ? (
              <p className="flex items-center justify-center gap-2 py-2 text-sm text-linen-600">
                <Truck className="h-4 w-4 animate-pulse" />
                Consultando o frete para o CEP do cliente…
              </p>
            ) : (
              <button
                type="button"
                onClick={() => cotar()}
                className="flex w-full items-center justify-center gap-2 rounded border border-champagne-600 bg-linen-50 py-2 text-xs uppercase tracking-[0.12em] text-champagne-700 transition-colors hover:bg-champagne-600 hover:text-linen-50"
              >
                <Truck className="h-4 w-4" /> Cotar frete para este endereço
              </button>
            ))}

          {cotacoes && (
            <div className="space-y-2">
              <div className="max-h-56 space-y-1 overflow-y-auto rounded bg-linen-50 p-2">
                {cotacoes.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-linen-100"
                  >
                    <input
                      type="radio"
                      name="frete-pedido"
                      checked={escolhida?.id === c.id}
                      onChange={() => setEscolhida(c)}
                      className="accent-champagne-600"
                    />
                    <span className="flex-1 text-linen-700">
                      {c.company} {c.name}
                      <span className="ml-1 text-xs text-linen-500">
                        até <span className="numeral">{c.deliveryTime}</span> dia(s)
                      </span>
                    </span>
                    <span className="numeral text-ink">{formatBRL(c.price)}</span>
                  </label>
                ))}
              </div>

              {jaPago && escolhida && (
                <p className="text-xs text-warning">
                  O pedido já foi pago, então o total <strong>não muda</strong> —
                  o frete de <span className="numeral">{formatBRL(escolhida.price)}</span> fica registrado como
                  absorvido pela loja, na nota interna.
                </p>
              )}

              <button
                type="button"
                disabled={busy || !escolhida}
                onClick={() => salvar(false)}
                className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors w-full py-2 hover:bg-champagne-700 disabled:opacity-60"
              >
                {busy ? "Salvando…" : "Definir transportadora"}
              </button>
            </div>
          )}
        </>
      )}

      {modo === "manual" && (
        <div className="space-y-2">
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700">
              Transportadora / serviço
            </label>
            <input
              value={nomeManual}
              onChange={(e) => setNomeManual(e.target.value)}
              placeholder="Correios PAC, Jadlog .Package, retirada na loja…"
              className="w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700">
              Valor do frete (R$)
            </label>
            <input
              value={precoManual}
              onChange={(e) => setPrecoManual(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="numeral w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600"
            />
          </div>

          <p className="rounded bg-linen-50 px-2 py-1.5 text-xs text-linen-600">
            {jaPago ? (
              <>
                O pedido já foi pago: o total <strong>não muda</strong>. O valor
                fica registrado na nota interna como absorvido pela loja.
              </>
            ) : (
              <>
                Este valor <strong>entra no total</strong> do pedido.
              </>
            )}{" "}
            Informado manualmente não rende etiqueta do Melhor Envio — despache
            por fora e cole o rastreio no campo &ldquo;Código de rastreio&rdquo;.
          </p>

          <button
            type="button"
            disabled={busy || !nomeManual.trim() || !Number.isFinite(precoValido)}
            onClick={() => salvar(true)}
            className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors w-full py-2 hover:bg-champagne-700 disabled:opacity-60"
          >
            {busy ? "Salvando…" : "Salvar transportadora"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded bg-danger/10 px-2 py-1.5 text-xs text-danger">{error}</p>
      )}

      {trocando && (
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="mt-2 w-full rounded border border-linen-300 py-2 text-center text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
