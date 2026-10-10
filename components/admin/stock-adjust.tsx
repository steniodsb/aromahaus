"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus } from "lucide-react";
import { ajustarEstoque } from "@/app/admin/(panel)/estoque/actions";

/** Ajuste rápido na linha do produto: entrada, saída e motivo. */
export function StockAdjust({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [qtd, setQtd] = useState("");
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(sinal: 1 | -1) {
    const n = Math.abs(Math.trunc(Number(qtd)));
    if (!n) {
      setError("Informe a quantidade.");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("product_id", productId);
    fd.append("delta", String(n * sinal));
    fd.append("note", nota);
    const res = await ajustarEstoque(fd);
    if (res?.error) setError(res.error);
    else {
      setQtd("");
      setNota("");
      setAberto(false);
      router.refresh();
    }
    setBusy(false);
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded border border-linen-300 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
      >
        Ajustar
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          value={qtd}
          onChange={(e) => setQtd(e.target.value.replace(/\D/g, ""))}
          placeholder="Qtd"
          aria-label="Quantidade"
          className="numeral w-16 rounded border border-linen-300 bg-linen-50 px-2 py-1.5 text-sm outline-none focus:border-champagne-600"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => enviar(1)}
          aria-label="Entrada"
          title="Entrada"
          className="rounded border border-success/40 p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={busy || stock === 0}
          onClick={() => enviar(-1)}
          aria-label="Saída"
          title="Saída"
          className="rounded border border-linen-300 p-1.5 text-linen-600 hover:bg-linen-100 disabled:opacity-50"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setError(null);
          }}
          className="px-1 text-xs text-linen-600 hover:text-ink"
        >
          Cancelar
        </button>
      </div>
      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Motivo (opcional)"
        className="w-52 rounded border border-linen-300 bg-linen-50 px-2 py-1.5 text-xs outline-none focus:border-champagne-600"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
