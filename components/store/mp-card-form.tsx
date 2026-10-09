"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { formatBRL } from "@/lib/utils";

/* ── Tipos mínimos do MercadoPago.js v2 ──────────────────────────────────── */

interface MPField {
  mount: (elementId: string) => MPField;
  unmount: () => void;
  on: (event: string, cb: (data: { bin?: string }) => void) => void;
}

interface MPInstallmentOption {
  installments: number;
  recommended_message: string;
  total_amount: number;
  /** 0 = sem juros. É a fonte da verdade para o rótulo — nunca o nosso config. */
  installment_rate: number;
}

interface MPInstance {
  fields: {
    create: (type: string, opts?: Record<string, unknown>) => MPField;
    createCardToken: (data: {
      cardholderName: string;
      identificationType: string;
      identificationNumber: string;
    }) => Promise<{ id: string }>;
  };
  getPaymentMethods: (opts: { bin: string }) => Promise<{
    results: { id: string; issuer?: { id: number } }[];
  }>;
  getInstallments: (opts: { bin: string; amount: string; paymentTypeId: string }) => Promise<
    { payer_costs: MPInstallmentOption[] }[]
  >;
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => MPInstance;
    MP_DEVICE_SESSION_ID?: string;
  }
}

/**
 * Rótulo de cada opção de parcela.
 *
 * O "sem juros" sai do `installment_rate` que o MP devolve, NÃO da configuração
 * da loja: quem decide se a parcela tem juro é a conta do vendedor no Mercado
 * Pago. Se a loja anunciar "2x sem juros" mas o MP cobrar juro, é aqui que o
 * cliente vê a verdade — e o total parcelado aparece junto, para ele comparar
 * antes de escolher.
 */
function installmentLabel(o: MPInstallmentOption): string {
  const parcela = formatBRL(o.total_amount / o.installments);
  if (o.installments === 1) return `À vista — ${parcela}`;
  if (!o.installment_rate) return `${o.installments}× de ${parcela} sem juros`;
  return `${o.installments}× de ${parcela} — total ${formatBRL(o.total_amount)}`;
}

/** Resultado da tokenização — é só isso que vai para o nosso servidor. */
export interface CardTokenResult {
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: string;
}

export interface CardFormHandle {
  /** Tokeniza o cartão no browser. Retorna null se os dados forem inválidos. */
  createToken: () => Promise<CardTokenResult | null>;
}

const SDK_SRC = "https://sdk.mercadopago.com/js/v2";

/** Carrega o SDK do Mercado Pago uma única vez por página. */
function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("sdk")));
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("sdk"));
    document.head.appendChild(s);
  });
}

const FIELD_BOX =
  "h-[42px] w-full border border-linen-300 px-3 focus-within:border-champagne-600";
const LABEL = "mb-1 block text-sm font-medium text-linen-700";

interface Props {
  /** Valor total — define as opções de parcelamento. */
  amount: number;
  /** CPF do titular (vem do formulário principal). */
  document: string;
  /** Teto de parcelas (Admin → Configurações → Checkout). */
  maxInstallments: number;
  onError?: (msg: string | null) => void;
}

/**
 * Campos de cartão do checkout transparente.
 *
 * ⚠️ Usa **Secure Fields** do Mercado Pago: número, validade e CVV são iframes
 * servidos pelo próprio MP. Os dados do cartão vão do browser DIRETO para o
 * Mercado Pago — nunca passam pelo nosso servidor nem pelo nosso React state.
 * Só o token descartável é enviado para a nossa API.
 */
export const MPCardForm = forwardRef<CardFormHandle, Props>(function MPCardForm(
  { amount, document: cpf, maxInstallments, onError },
  ref,
) {
  const mpRef = useRef<MPInstance | null>(null);
  const fieldsRef = useRef<MPField[]>([]);
  const binRef = useRef<string>("");

  const [ready, setReady] = useState(false);
  const [holder, setHolder] = useState("");
  const [installments, setInstallments] = useState(1);
  const [options, setOptions] = useState<MPInstallmentOption[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [issuerId, setIssuerId] = useState<string | undefined>();

  // Busca meios de pagamento e parcelas assim que o BIN (6 primeiros dígitos)
  // do cartão é identificado.
  const handleBin = useCallback(
    async (bin?: string) => {
      const mp = mpRef.current;
      if (!mp || !bin || bin === binRef.current) return;
      binRef.current = bin;
      try {
        const pm = await mp.getPaymentMethods({ bin });
        const first = pm.results?.[0];
        if (first) {
          setMethodId(first.id);
          setIssuerId(first.issuer?.id != null ? String(first.issuer.id) : undefined);
        }
        const inst = await mp.getInstallments({
          bin,
          amount: String(amount.toFixed(2)),
          paymentTypeId: "credit_card",
        });
        const costs = inst?.[0]?.payer_costs ?? [];
        // O MP devolve tudo que a bandeira aceita (chega a 12x/24x); o teto de
        // vitrine é decisão da loja, então cortamos aqui.
        const allowed = costs.filter((o) => o.installments <= maxInstallments);
        setOptions(allowed);
        // Se o teto baixou (ou a bandeira oferece menos), a parcela escolhida
        // pode ter deixado de existir — mandar isso ao MP daria recusa.
        setInstallments((cur) =>
          allowed.some((o) => o.installments === cur) ? cur : 1,
        );
      } catch {
        setOptions([]);
      }
    },
    [amount, maxInstallments],
  );

  useEffect(() => {
    let cancelled = false;
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    if (!publicKey) {
      onError?.("Pagamento com cartão indisponível (chave não configurada).");
      return;
    }

    loadSdk()
      .then(() => {
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        mpRef.current = mp;

        const number = mp.fields
          .create("cardNumber", { placeholder: "0000 0000 0000 0000" })
          .mount("mp-card-number");
        const expiry = mp.fields
          .create("expirationDate", { placeholder: "MM/AA" })
          .mount("mp-card-expiry");
        const cvv = mp.fields
          .create("securityCode", { placeholder: "123" })
          .mount("mp-card-cvv");

        number.on("binChange", (d) => void handleBin(d.bin));
        fieldsRef.current = [number, expiry, cvv];
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) onError?.("Não foi possível carregar o formulário de cartão.");
      });

    return () => {
      cancelled = true;
      // Desmonta os iframes (evita duplicar no StrictMode / re-render)
      fieldsRef.current.forEach((f) => {
        try {
          f.unmount();
        } catch {
          /* já desmontado */
        }
      });
      fieldsRef.current = [];
    };
    // `handleBin` muda com o valor; remontar os campos aqui apagaria o que o
    // cliente já digitou, então os campos são montados uma única vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    async createToken() {
      const mp = mpRef.current;
      if (!mp) {
        onError?.("Formulário de cartão ainda carregando.");
        return null;
      }
      if (!holder.trim()) {
        onError?.("Informe o nome impresso no cartão.");
        return null;
      }
      if (!methodId) {
        onError?.("Não reconhecemos a bandeira do cartão. Confira o número.");
        return null;
      }
      try {
        const { id } = await mp.fields.createCardToken({
          cardholderName: holder.trim(),
          identificationType: "CPF",
          identificationNumber: cpf.replace(/\D/g, ""),
        });
        return { token: id, installments, paymentMethodId: methodId, issuerId };
      } catch {
        onError?.("Dados do cartão inválidos. Confira número, validade e CVV.");
        return null;
      }
    },
  }));

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL}>Número do cartão</label>
        <div id="mp-card-number" className={FIELD_BOX} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Validade</label>
          <div id="mp-card-expiry" className={FIELD_BOX} />
        </div>
        <div>
          <label className={LABEL}>CVV</label>
          <div id="mp-card-cvv" className={FIELD_BOX} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Nome impresso no cartão</label>
        <input
          className="w-full border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="como está no cartão"
          autoComplete="cc-name"
        />
      </div>

      {options.length > 0 && (
        <div>
          <label className={LABEL}>Parcelas</label>
          <select
            className="w-full border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600"
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
          >
            {options.map((o) => (
              <option key={o.installments} value={o.installments}>
                {installmentLabel(o)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!ready && (
        <p className="text-sm text-linen-500">Carregando formulário seguro…</p>
      )}
    </div>
  );
});
