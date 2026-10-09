"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copiar endereço/rastreio/ID sem selecionar com o mouse. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copiado, setCopiado] = useState(false);

  if (!value) return null;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          // Clipboard bloqueado (contexto sem HTTPS, permissão negada). Silencioso
          // de propósito: é um atalho, não uma função crítica.
        }
      }}
      className="rounded p-1 text-linen-500 hover:bg-linen-100 hover:text-champagne-700"
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
