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
            className="inline-flex items-center gap-2 rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
          >
            <Upload className="h-4 w-4" /> Escolher CSV
          </button>
          {arquivo && <span className="text-sm text-linen-600">{arquivo.name}</span>}
          {arquivo && !aplicado && (
            <button
              type="button"
              disabled={busy}
              onClick={() => enviar(false)}
              className="rounded bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700 disabled:opacity-60"
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
        <p className="rounded bg-danger/10 px-4 py-3 text-sm text-danger">{res.error}</p>
      )}

      {res?.ok && (
        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          {aplicado ? (
            <p className="mb-4 flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="numeral">{res.atualizados}</span> produto{res.atualizados === 1 ? "" : "s"} atualizado
              {res.atualizados === 1 ? "" : "s"}.
            </p>
          ) : (
            <h2 className="mb-4 font-display text-lg text-ink">Simulação — nada foi salvo ainda</h2>
          )}

          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Resumo n={res.atualizados} rotulo={aplicado ? "atualizados" : "vão mudar"} destaque />
            <Resumo n={res.semMudanca} rotulo="sem mudança" />
            <Resumo n={res.naoEncontrados} rotulo="SKU não achado" alerta={res.naoEncontrados > 0} />
            <Resumo n={res.comErro} rotulo="com erro" alerta={res.comErro > 0} />
          </div>

          {res.linhas.length > 0 && (
            <div className="max-h-96 overflow-y-auto rounded border border-linen-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-linen-100 text-left text-[0.6875rem] uppercase tracking-[0.12em] text-linen-600">
                  <tr>
                    <th className="p-2">Linha</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Produto</th>
                    <th className="p-2">Mudanças</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linen-200">
                  {res.linhas.map((l) => (
                    <tr key={`${l.linha}-${l.sku}`}>
                      <td className="numeral p-2 text-linen-500">{l.linha}</td>
                      <td className="numeral p-2 font-mono text-xs">{l.sku || "—"}</td>
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
                              <span key={campo} className="numeral text-xs">
                                <span className="text-linen-600">{campo}:</span>{" "}
                                <span className="text-linen-500 line-through">{antes}</span>{" "}
                                <span className="text-ink">{depois}</span>
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
              className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors mt-4 px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
            >
              {busy ? "Aplicando…" : `Aplicar ${res.atualizados} mudança${res.atualizados === 1 ? "" : "s"}`}
            </button>
          )}

          {!aplicado && res.atualizados === 0 && (
            <p className="mt-2 text-sm text-linen-600">
              Nenhuma mudança para aplicar. Confira se a planilha tem valores diferentes dos atuais e se os SKUs batem com o catálogo.
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
      className={`rounded border p-3 ${
        alerta ? "border-warning/40 bg-warning/10" : "border-linen-200 bg-linen-50"
      }`}
    >
      <p className={`numeral text-xl ${destaque ? "text-champagne-700" : alerta ? "text-warning" : "text-ink"}`}>
        {n}
      </p>
      <p className="text-xs text-linen-600">{rotulo}</p>
    </div>
  );
}
