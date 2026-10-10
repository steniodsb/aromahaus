"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/utils";

export default function RastreioPage() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <p className="eyebrow">Pedido</p>
      <h1 className="font-display-xl rule mt-4 text-[clamp(2rem,4.5vw,3rem)] text-ink">
        Rastrear pedido
      </h1>
      <p className="mt-7 text-[0.9375rem] leading-relaxed text-linen-700">
        Acompanhe a entrega com o código do pedido ou o código de rastreio dos
        Correios.
      </p>

      <ul className="mt-6 space-y-2 text-sm leading-relaxed text-linen-700">
        <li className="flex gap-3">
          <span aria-hidden="true" className="text-champagne-600">
            —
          </span>
          O código do pedido está no e-mail de confirmação.
        </li>
        <li className="flex gap-3">
          <span aria-hidden="true" className="text-champagne-600">
            —
          </span>
          O código de rastreio chega por e-mail quando o pedido é postado.
        </li>
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="mt-10"
      >
        <label htmlFor="codigo" className="eyebrow">
          Código
        </label>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row">
          <input
            id="codigo"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código do pedido ou de rastreio"
            className="w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600"
          />
          <button
            type="submit"
            className="border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
          >
            Rastrear
          </button>
        </div>
      </form>

      {submitted && (
        <div className="mt-10 border border-line bg-linen-100 p-6">
          <p className="font-display text-xl text-ink">Consulta pelo WhatsApp</p>
          <p className="mt-3 text-sm leading-relaxed text-linen-700">
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
            className="mt-6 inline-flex border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
          >
            Consultar pelo WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
