"use client";

import { useState } from "react";
import { Package, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/utils";

export default function RastreioPage() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Package className="h-8 w-8 text-champagne-700" />
        <h1 className="text-3xl font-bold text-ink">Rastrear pedido</h1>
      </div>
      <p className="mb-8 text-linen-600">
        Informe o código do seu pedido ou o código de rastreio dos Correios para
        acompanhar a entrega.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código do pedido ou rastreio"
          className="flex-1 rounded-full border border-linen-300 px-5 py-3 outline-none focus:border-champagne-600"
        />
        <button
          type="submit"
          className="border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
        >
          Rastrear
        </button>
      </form>

      {submitted && (
        <div className="mt-8 border border-linen-200 bg-linen-100 p-6 text-center">
          <p className="mb-4 text-linen-700">
            O rastreamento automático está sendo integrado. Por enquanto, envie
            seu código pelo WhatsApp que retornamos o status do seu pedido
            rapidamente.
          </p>
          <a
            href={whatsappLink(
              `Olá! Quero rastrear meu pedido. Código: ${code || "(informar)"}`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
          >
            <MessageCircle className="h-5 w-5" />
            Consultar pelo WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
