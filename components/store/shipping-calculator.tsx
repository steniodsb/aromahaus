"use client";

import { useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { formatBRL } from "@/lib/utils";

interface Quote {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryTime: number;
}

export function ShippingCalculator({
  productId,
  variantId = null,
}: {
  productId: string;
  /** Tamanho escolhido. Muda o peso e a caixa, e portanto o frete. */
  variantId?: string | null;
}) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function maskCep(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  async function calculate() {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("Digite um CEP válido (8 dígitos).");
      return;
    }
    setError(null);
    setLoading(true);
    setQuotes(null);
    setPlace(null);
    try {
      // 1) Resolve a localidade via ViaCEP (grátis, sem auth)
      const via = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        .then((r) => r.json())
        .catch(() => null);
      if (via && !via.erro) {
        setPlace(`${via.localidade} - ${via.uf}`);
      } else {
        setError("CEP não encontrado.");
        setLoading(false);
        return;
      }

      // 2) Cotações reais via Melhor Envio (vazio se sem token configurado)
      const res = await fetch("/api/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep: digits,
          items: [{ id: productId, variantId, qty: 1 }],
        }),
      });
      const data = await res.json().catch(() => ({ quotes: [] }));
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch {
      setError("Não foi possível calcular agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line p-5">
      <div className="mb-4 flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] text-linen-700">
        <Truck className="h-4 w-4 text-champagne-600" strokeWidth={1.4} />
        Calcular frete e prazo
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          calculate();
        }}
        className="flex gap-2"
      >
        <input
          inputMode="numeric"
          value={cep}
          onChange={(e) => setCep(maskCep(e.target.value))}
          placeholder="Seu CEP"
          aria-label="CEP de entrega"
          className="w-36 border-0 border-b border-linen-300 bg-transparent px-1 py-2 text-sm outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 border border-linen-900 px-5 py-2 text-[0.625rem] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-linen-900 hover:text-linen-50 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Calcular
        </button>
        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="self-center text-xs text-linen-500 underline transition-colors hover:text-champagne-700"
        >
          não sei meu CEP
        </a>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {place && (
        <p className="mt-4 text-sm text-linen-700">
          Entrega para <span className="text-ink">{place}</span>
        </p>
      )}

      {quotes && quotes.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {quotes.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-linen-700">
                {q.company} {q.name}
                <span className="text-linen-500"> · {q.deliveryTime} dia(s) útil(eis)</span>
              </span>
              <span className="text-ink">{formatBRL(q.price)}</span>
            </li>
          ))}
        </ul>
      )}

      {quotes && quotes.length === 0 && place && (
        <p className="mt-3 border-t border-line pt-3 text-sm text-linen-600">
          O frete é calculado no fechamento do pedido. Em caso de dúvida, fale
          com a gente pelo WhatsApp.
        </p>
      )}
    </div>
  );
}
