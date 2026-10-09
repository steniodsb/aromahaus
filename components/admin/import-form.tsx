"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  importarProdutos,
  type ImportResult,
} from "@/app/admin/(panel)/produtos/import-actions";

export function ImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [res, setRes] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  async function enviar(aplicar: boolean) {
    if (!arquivo) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", arquivo);
    if (aplicar) fd.append("aplicar", "on");
    const r = await importarProdutos(fd);
    setRes(r);
    if (aplicar && r.ok) {
      setAplicado(true);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-linen-200 bg-linen-50 p-5">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null);
            setRes(null);
            setAplicado(false);
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-linen-300 px-4 py-2 text-sm font-medium text-linen-700 hover:border-champagne-500 hover:text-champagne-700"
          >
            <Upload className="h-4 w-4" /> Escolher CSV
          </button>
          {arquivo && <span className="text-sm text-linen-600">{arquivo.name}</span>}
          {arquivo && !aplicado && (
            <button
              type="button"
              disabled={busy}
              onClick={() => enviar(false)}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
            >
              {busy ? "Lendo…" : "Simular"}
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-linen-600">
          Simular não escreve nada — mostra exatamente o que mudaria.
        </p>
      </div>

      {res?.error && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{res.error}</p>
      )}

      {res?.ok && (
        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          {aplicado ? (
            <p className="mb-4 flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="h-5 w-5" />
              {res.atualizados} produto{res.atualizados === 1 ? "" : "s"} atualizado
              {res.atualizados === 1 ? "" : "s"}.
            </p>
          ) : (
            <h2 className="mb-4 font-semibold text-ink">Simulação — nada foi salvo ainda</h2>
          )}

          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Resumo n={res.atualizados} rotulo={aplicado ? "atualizados" : "vão mudar"} destaque />
            <Resumo n={res.semMudanca} rotulo="sem mudança" />
            <Resumo n={res.naoEncontrados} rotulo="SKU não achado" alerta={res.naoEncontrados > 0} />
            <Resumo n={res.comErro} rotulo="com erro" alerta={res.comErro > 0} />
          </div>

          {res.linhas.length > 0 && (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-linen-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-linen-100 text-left text-xs uppercase text-linen-600">
                  <tr>
                    <th className="p-2">Linha</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Produto</th>
                    <th className="p-2">Mudanças</th>
                  </tr>
                </thead>
                <tbody>
                  {res.linhas.map((l) => (
                    <tr key={`${l.linha}-${l.sku}`} className="border-t border-linen-100">
                      <td className="p-2 text-linen-500">{l.linha}</td>
                      <td className="p-2 font-mono text-xs">{l.sku || "—"}</td>
                      <td className="p-2 text-linen-700">{l.nome || "—"}</td>
                      <td className="p-2">
                        {l.erro ? (
                          <span className="flex items-center gap-1 text-warning">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {l.erro}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {Object.entries(l.mudancas).map(([campo, [antes, depois]]) => (
                              <span key={campo} className="text-xs">
                                <span className="text-linen-600">{campo}:</span>{" "}
                                <span className="text-linen-500 line-through">{antes}</span>{" "}
                                <span className="font-semibold text-ink">{depois}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!aplicado && res.atualizados > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => enviar(true)}
              className="mt-4 rounded-lg bg-champagne-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-champagne-700 disabled:opacity-60"
            >
              {busy ? "Aplicando…" : `Aplicar ${res.atualizados} mudança${res.atualizados === 1 ? "" : "s"}`}
            </button>
          )}

          {!aplicado && res.atualizados === 0 && (
            <p className="mt-2 text-sm text-linen-600">
              Nenhuma mudança para aplicar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Resumo({
  n,
  rotulo,
  destaque,
  alerta,
}: {
  n: number;
  rotulo: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        alerta ? "border-amber-300 bg-warning/10" : "border-linen-200 bg-linen-50"
      }`}
    >
      <p className={`text-xl font-bold ${destaque ? "text-champagne-700" : alerta ? "text-warning" : "text-ink"}`}>
        {n}
      </p>
      <p className="text-xs text-linen-600">{rotulo}</p>
    </div>
  );
}
