"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, Check, ExternalLink } from "lucide-react";

interface PixData {
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

interface BoletoData {
  url?: string;
  barcode?: string;
}

function CopyButton({ value, children }: { value: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bloqueado pelo navegador: o código segue visível para copiar à mão */
      setFailed(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex w-full items-center justify-center gap-2 border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={1.4} />
        ) : (
          <Copy className="h-4 w-4" strokeWidth={1.4} />
        )}
        {copied ? "Código copiado" : children}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Código copiado" : ""}
      </span>
      {failed && (
        <p className="mt-2 text-xs text-danger">
          Não foi possível copiar automaticamente. Selecione o código acima e copie.
        </p>
      )}
    </>
  );
}

/** Código copiável: monoespaçado, com algarismos alinhados. */
function CodeBox({ children }: { children: string }) {
  return (
    <div className="numeral mb-3 select-all break-all border border-line bg-linen-100 p-3 text-left font-mono text-xs leading-relaxed text-ink">
      {children}
    </div>
  );
}

/** QR code do Pix + código copia-e-cola. */
export function PixPayment({ pix }: { pix: PixData }) {
  const router = useRouter();

  // O Pix cai de forma assíncrona: o webhook marca o pedido como pago, e este
  // refresh faz a página perceber sozinha, sem o cliente recarregar.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(timer);
  }, [router]);

  if (!pix.qr_code) return null;

  return (
    <section className="mt-10 border border-champagne-500 p-6 text-center sm:p-8">
      <p className="eyebrow">Pagamento</p>
      <h2 className="font-display mt-3 text-2xl text-ink">Pague com Pix para liberar o pedido</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-linen-700">
        Abra o app do seu banco, escaneie o QR code ou use o Pix copia e cola.
      </p>

      {pix.qr_code_base64 && (
        <Image
          src={`data:image/png;base64,${pix.qr_code_base64}`}
          alt="QR code do Pix"
          width={220}
          height={220}
          unoptimized
          className="mx-auto my-6 border border-line bg-white p-2"
        />
      )}

      <p className="eyebrow mb-2 text-left">Pix copia e cola</p>
      <CodeBox>{pix.qr_code}</CodeBox>

      <CopyButton value={pix.qr_code}>Copiar código Pix</CopyButton>

      <p className="mt-4 text-xs leading-relaxed text-linen-600">
        Esta página confere o pagamento sozinha. Assim que o Pix cair, o pedido é
        confirmado e você não precisa fazer mais nada.
      </p>
    </section>
  );
}

/** Link do boleto + linha digitável. */
export function BoletoPayment({ boleto }: { boleto: BoletoData }) {
  if (!boleto.url) return null;

  return (
    <section className="mt-10 border border-champagne-500 p-6 text-center sm:p-8">
      <p className="eyebrow">Pagamento</p>
      <h2 className="font-display mt-3 text-2xl text-ink">Seu boleto está pronto</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-linen-700">
        A compensação leva até 3 dias úteis. O pedido é liberado depois disso.
      </p>

      <a
        href={boleto.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center justify-center gap-2 border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
      >
        <ExternalLink className="h-4 w-4" strokeWidth={1.4} /> Abrir boleto
      </a>

      {boleto.barcode && (
        <div className="mt-8">
          <p className="eyebrow mb-2 text-left">Linha digitável</p>
          <CodeBox>{boleto.barcode}</CodeBox>
          <CopyButton value={boleto.barcode}>Copiar código de barras</CopyButton>
        </div>
      )}
    </section>
  );
}
