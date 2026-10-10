"use client";

import { useRef, useState } from "react";
import { Upload, ImageIcon, X, Link2 } from "lucide-react";
import {
  uploadAdminImage,
  listProductImages,
  type UploadFolder,
} from "@/app/actions/admin-upload";
import { UploadHint } from "@/components/admin/upload-hint";
import {
  getSpec,
  FORMATOS_ACEITOS,
  checarArquivo,
  checarDimensoes,
  lerDimensoes,
  type ImageSpecKey,
} from "@/lib/image-specs";

/**
 * Campo de imagem dos banners.
 *
 * Três caminhos, porque cada um resolve um caso real:
 *   • upload — imagem nova, direto do computador;
 *   • produto — reaproveita uma imagem já cadastrada (era o motivo de existir
 *     a instrução "copie a URL da imagem em Produtos");
 *   • URL — para imagem hospedada fora.
 *
 * Os previews usam `<img>` puro, não `next/image`, de propósito: o
 * `remotePatterns` do next.config só libera o Supabase e o YouTube, então uma
 * URL de qualquer outro host derrubaria a tela do admin com erro em runtime.
 * São miniaturas de 80px — não há o que otimizar.
 */
export function ImageField({
  value,
  onChange,
  label = "Imagem",
  folder = "banner",
  spec,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** Qual imagem da loja é esta — define medida recomendada e validação. */
  spec: ImageSpecKey;
  /** Pasta no bucket. Mantém banner/blog/categoria separados no Storage. */
  folder?: UploadFolder;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [produtos, setProdutos] = useState<{ name: string; images: string[] }[] | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setAviso(null);

    // Barra ANTES de subir. O servidor também valida, mas deixar o upload de
    // um arquivo de 20 MB terminar para só então recusar é esperar à toa.
    const checagem = checarArquivo(file);
    if (!checagem.ok) {
      setError(checagem.erro ?? "Arquivo inválido.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    // Dimensão só avisa — imagem fora da medida ideal ainda é melhor que
    // nenhuma, e travar o cadastro por estética seria pior.
    const dim = await lerDimensoes(file);
    if (dim) {
      const d = checarDimensoes(dim.largura, dim.altura, getSpec(spec));
      if (d.aviso) setAviso(d.aviso);
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await uploadAdminImage(fd);
      if (!res.ok || !res.url) setError(res.error ?? "Falha ao enviar a imagem.");
      else onChange(res.url);
    } catch {
      setError("Falha ao enviar a imagem.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function abrirPicker() {
    setPicker(true);
    if (produtos === null) {
      setBusy(true);
      try {
        setProdutos(await listProductImages());
      } catch {
        setProdutos([]);
      } finally {
        setBusy(false);
      }
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded border border-linen-300 px-3 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-50";

  return (
    <div>
      <label className="mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700">{label}</label>

      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-linen-200 bg-linen-100">
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Remover imagem"
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-linen-300">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className={btn}
            >
              <Upload className="h-3.5 w-3.5" />
              {busy ? "Enviando…" : "Enviar imagem"}
            </button>
            <button type="button" disabled={busy} onClick={abrirPicker} className={btn}>
              <ImageIcon className="h-3.5 w-3.5" /> Usar de um produto
            </button>
            <button
              type="button"
              onClick={() => setShowUrl((v) => !v)}
              className={btn}
            >
              <Link2 className="h-3.5 w-3.5" /> URL
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={FORMATOS_ACEITOS.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />

          {showUrl && (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…/imagem.jpg"
              className="w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600"
            />
          )}

          {error && (
            <p className="rounded bg-danger/10 px-2 py-1.5 text-xs text-danger">{error}</p>
          )}
          {aviso && (
            <p className="rounded bg-warning/10 px-2 py-1.5 text-xs text-warning">{aviso}</p>
          )}
          <UploadHint spec={spec} />
        </div>
      </div>

      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPicker(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded bg-linen-50 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">Imagens dos produtos</h3>
              <button
                type="button"
                onClick={() => setPicker(false)}
                className="rounded p-1 text-linen-500 hover:bg-linen-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {busy && <p className="text-sm text-linen-600">Carregando…</p>}

            {!busy && produtos?.length === 0 && (
              <p className="text-sm text-linen-600">
                Nenhum produto tem imagem cadastrada ainda. Envie as fotos em Produtos e volte aqui para reaproveitá-las.
              </p>
            )}

            <div className="space-y-5">
              {produtos?.map((p) => (
                <div key={p.name}>
                  <p className="mb-2 text-xs text-linen-700">{p.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.images.map((img) => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => {
                          onChange(img);
                          setPicker(false);
                        }}
                        className="h-20 w-20 overflow-hidden rounded border-2 border-transparent hover:border-champagne-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
