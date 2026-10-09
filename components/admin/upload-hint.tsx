import { Info } from "lucide-react";
import {
  getSpec,
  MAX_UPLOAD_MB,
  FORMATOS_LABEL,
  medidaTexto,
  type ImageSpecKey,
} from "@/lib/image-specs";

/**
 * Bloco de recomendação do campo de upload.
 *
 * Fica SEMPRE visível, antes de escolher o arquivo — a medida só serve se for
 * lida antes de exportar a imagem. Antes era uma linha cinza depois dos
 * botões, fácil de não ver.
 */
export function UploadHint({ spec: chave }: { spec: ImageSpecKey }) {
  const spec = getSpec(chave);

  return (
    <div className="rounded-lg border border-linen-200 bg-linen-100 px-3 py-2 text-xs">
      <p className="flex items-start gap-1.5 font-medium text-linen-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-champagne-700" />
        <span>
          Tamanho recomendado: <strong>{medidaTexto(spec)}</strong>
        </span>
      </p>
      <p className="mt-1 pl-5 text-linen-600">
        Aparece em: {spec.onde}. Máximo {MAX_UPLOAD_MB} MB, em {FORMATOS_LABEL}.
      </p>
      {spec.nota && <p className="mt-1 pl-5 text-linen-600">{spec.nota}</p>}
    </div>
  );
}
