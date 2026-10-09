"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, Check, Barcode, ExternalLink } from "lucide-react";

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

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bloqueado pelo navegador */
    }
  }

  return (
    <button
      onClick={copy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-champagne-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-champagne-700"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : children}
    </button>
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
    <div className="mt-6 border border-linen-200 bg-linen-50 p-5 text-center">
      <h2 className="font-semibold text-ink">Pague com Pix para liberar seu pedido</h2>
      <p className="mt-1 text-sm text-linen-600">
        Abra o app do seu banco, escaneie o QR code ou cole o código.
      </p>

      {pix.qr_code_base64 && (
        <Image
          src={`data:image/png;base64,${pix.qr_code_base64}`}
          alt="QR code do Pix"
          width={220}
          height={220}
          unoptimized
          className="mx-auto my-5 border border-linen-200"
        />
      )}

      <div className="mb-3 break-all bg-linen-100 p-3 text-left font-mono text-xs text-linen-600">
        {pix.qr_code}
      </div>

      <CopyButton value={pix.qr_code}>Copiar código Pix</CopyButton>

      <p className="mt-3 text-xs text-linen-500">
        Assim que o pagamento cair, o pedido é confirmado automaticamente —
        você não precisa fazer mais nada.
      </p>
    </div>
  );
}

/** Link do boleto + linha digitável. */
export function BoletoPayment({ boleto }: { boleto: BoletoData }) {
  if (!boleto.url) return null;

  return (
    <div className="mt-6 border border-linen-200 bg-linen-50 p-5 text-center">
      <Barcode className="mx-auto mb-3 h-10 w-10 text-champagne-700" />
      <h2 className="font-semibold text-ink">Seu boleto está pronto</h2>
      <p className="mt-1 text-sm text-linen-600">
        A compensação leva até 3 dias úteis. O pedido é liberado depois disso.
      </p>

      <a
        href={boleto.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-champagne-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-champagne-700"
      >
        <ExternalLink className="h-4 w-4" /> Abrir boleto
      </a>

      {boleto.barcode && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-linen-600">Linha digitável</p>
          <div className="mb-3 break-all bg-linen-100 p-3 font-mono text-xs text-linen-600">
            {boleto.barcode}
          </div>
          <CopyButton value={boleto.barcode}>Copiar código de barras</CopyButton>
        </div>
      )}
    </div>
  );
}
