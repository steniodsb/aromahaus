"use client";

import { useRef, useState } from "react";
import { Upload, ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { uploadAdminImage } from "@/app/actions/admin-upload";
import { UploadHint } from "@/components/admin/upload-hint";
import {
  getSpec,
  FORMATOS_ACEITOS,
  checarArquivo,
  checarDimensoes,
  lerDimensoes,
} from "@/lib/image-specs";

/**
 * Galeria de imagens do produto.
 *
 * O formulário antigo mostrava só a PRIMEIRA imagem e tinha um `<input file>`
 * solto: subir uma nova adicionava à galeria, mas as demais ficavam invisíveis
 * — uma imagem errada entrava e não saía mais pelo painel.
 *
 * Aqui a ordem é o que a loja usa: a primeira é a capa (é ela que aparece na
 * vitrine e no card), por isso o botão de mover existe.
 *
 * Previews com `<img>` puro: `next/image` só aceita hosts do `remotePatterns`,
 * e uma URL antiga de outro host derrubaria a tela inteira.
 */
export function GalleryField({ initial }: { initial: string[] }) {
  const [imagens, setImagens] = useState<string[]>(initial);
  const [enviando, setEnviando] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function enviar(files: FileList) {
    setError(null);
    setAviso(null);

    // Valida TODOS antes de subir qualquer um: com seleção múltipla, subir
    // metade e travar no arquivo grande deixaria a galeria pela metade sem o
    // admin entender o que entrou e o que não entrou.
    const escolhidos = Array.from(files);
    for (const file of escolhidos) {
      const c = checarArquivo(file);
      if (!c.ok) {
        setError(`${file.name}: ${c.erro}`);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }

    // Dimensão só avisa — imagem fora da medida ainda é melhor que nenhuma.
    const avisos: string[] = [];
    for (const file of escolhidos) {
      const dim = await lerDimensoes(file);
      if (!dim) continue;
      const d = checarDimensoes(dim.largura, dim.altura, getSpec("produto"));
      if (d.aviso) avisos.push(`${file.name}: ${d.aviso}`);
    }
    if (avisos.length) setAviso(avisos.join(" "));

    setEnviando(escolhidos.length);
    try {
      // Sequencial de propósito: o Storage do Supabase estrangula rajada, e
      // upload paralelo aqui costuma voltar erro em metade dos arquivos.
      for (const file of escolhidos) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "produtos");
        const res = await uploadAdminImage(fd);
        if (!res.ok || !res.url) {
          setError(res.error ?? "Falha ao enviar a imagem.");
          break;
        }
        setImagens((s) => [...s, res.url!]);
        setEnviando((n) => n - 1);
      }
    } finally {
      setEnviando(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function mover(i: number, dir: number) {
    setImagens((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copia = [...s];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  return (
    <div>
      {/* As URLs viajam por aqui para o FormData da server action. */}
      <input type="hidden" name="images" value={imagens.join(",")} />

      {imagens.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {imagens.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-linen-200 bg-linen-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />

              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Capa
                </span>
              )}

              <button
                type="button"
                onClick={() => setImagens((s) => s.filter((_, idx) => idx !== i))}
                aria-label="Remover imagem"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>

              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  aria-label="Mover para trás"
                  className="rounded p-0.5 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === imagens.length - 1}
                  aria-label="Mover para frente"
                  className="rounded p-0.5 text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {imagens.length === 0 && (
        <div className="mb-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-linen-300 text-linen-300">
          <ImageIcon className="h-8 w-8" />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={FORMATOS_ACEITOS.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void enviar(e.target.files);
        }}
      />

      <button
        type="button"
        disabled={enviando > 0}
        onClick={() => fileRef.current?.click()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-linen-300 px-3 py-2 text-sm font-medium text-linen-700 hover:border-champagne-500 hover:text-champagne-700 disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />
        {enviando > 0 ? `Enviando ${enviando}…` : "Enviar imagens"}
      </button>

      {error && (
        <p className="mt-2 rounded-lg bg-danger/10 px-2 py-1.5 text-xs text-danger">{error}</p>
      )}
      {aviso && (
        <p className="mt-2 rounded-lg bg-warning/10 px-2 py-1.5 text-xs text-amber-800">{aviso}</p>
      )}

      <div className="mt-2 space-y-2">
        <UploadHint spec="produto" />
        <p className="text-xs text-linen-500">
          A primeira imagem é a capa. Use as setas ao passar o mouse para
          reordenar.
        </p>
      </div>
    </div>
  );
}
