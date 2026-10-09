/**
 * Medidas recomendadas de cada imagem da loja.
 *
 * Fonte única: os textos viviam soltos em cada formulário, então cada tela
 * podia dizer uma coisa diferente da outra — e nada garantia que o número
 * batesse com o recorte real do componente na vitrine.
 *
 * Os valores saem da proporção que o componente REALMENTE usa. Se o layout
 * mudar, muda aqui e todas as telas acompanham.
 */

export interface ImageSpec {
  /** Largura recomendada em px. */
  width: number;
  /** Altura recomendada em px. */
  height: number;
  /** Proporção legível, ex.: "1:1". */
  ratio: string;
  /** Onde essa imagem aparece — ajuda a decidir o enquadramento. */
  onde: string;
  /** Dica de enquadramento, quando o recorte engana. */
  nota?: string;
}

/** Teto de tamanho do arquivo. Precisa bater com o do servidor. */
export const MAX_UPLOAD_MB = 5;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const FORMATOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
export const FORMATOS_LABEL = "JPG, PNG ou WebP";

export const IMAGE_SPECS = {
  produto: {
    width: 1000,
    height: 1000,
    ratio: "1:1",
    onde: "vitrine, card e página do produto",
    nota: "A loja corta em quadrado — outra proporção perde as bordas. Fundo branco ou neutro, produto centralizado.",
  },
  banner_fundo: {
    width: 1920,
    height: 800,
    ratio: "12:5",
    onde: "fundo do carrossel da home, largura toda",
    nota: "O texto fica por cima do lado esquerdo — evite informação importante nessa área.",
  },
  banner_produto: {
    width: 1200,
    height: 900,
    ratio: "4:3",
    onde: "card à direita no carrossel",
    nota: "Fundo transparente (PNG) fica melhor.",
  },
  mini_banner: {
    width: 800,
    height: 600,
    ratio: "4:3",
    onde: "cartões de categoria na home",
  },
  promo: {
    width: 1200,
    height: 400,
    ratio: "3:1",
    onde: "faixa promocional da home",
    nota: "Faixa larga e baixa — imagem alta demais é cortada em cima e embaixo.",
  },
  blog: {
    width: 1200,
    height: 675,
    ratio: "16:9",
    onde: "capa do artigo e listagem do blog",
  },
  categoria: {
    width: 600,
    height: 600,
    ratio: "1:1",
    onde: "cartão de categoria",
  },
} satisfies Record<string, ImageSpec>;

export type ImageSpecKey = keyof typeof IMAGE_SPECS;

/**
 * Acesso tipado às medidas.
 *
 * `satisfies` mantém o tipo literal de cada entrada, então quem não declara
 * `nota` simplesmente não tem a propriedade e o TypeScript recusa a leitura.
 * Este acessor alarga o retorno para `ImageSpec`, onde `nota` é opcional —
 * sem perder a checagem das chaves, que continua vindo de `ImageSpecKey`.
 */
export function getSpec(chave: ImageSpecKey): ImageSpec {
  return IMAGE_SPECS[chave];
}

/** "1000 × 1000 px (1:1)" */
export function medidaTexto(spec: ImageSpec) {
  return `${spec.width} × ${spec.height} px (${spec.ratio})`;
}

export interface ChecagemImagem {
  ok: boolean;
  /** Impede o envio. */
  erro?: string;
  /** Deixa enviar, mas avisa que o resultado pode ficar ruim. */
  aviso?: string;
}

/**
 * Valida o arquivo ANTES de subir.
 *
 * O servidor também valida — esta checagem existe para o admin não esperar o
 * upload inteiro de um arquivo de 20 MB só para receber a recusa no fim.
 */
export function checarArquivo(file: File): ChecagemImagem {
  if (!file.type.startsWith("image/")) {
    return { ok: false, erro: "Esse arquivo não é uma imagem." };
  }
  if (!FORMATOS_ACEITOS.includes(file.type)) {
    return {
      ok: false,
      erro: `Formato não aceito. Use ${FORMATOS_LABEL}.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      erro: `A imagem tem ${mb} MB e o limite é ${MAX_UPLOAD_MB} MB. Reduza antes de enviar.`,
    };
  }
  return { ok: true };
}

/**
 * Compara as dimensões reais com a recomendação.
 *
 * Só AVISA, nunca bloqueia: uma imagem fora da medida ideal ainda é melhor do
 * que nenhuma, e bloquear travaria o cadastro por um detalhe estético.
 */
export function checarDimensoes(
  largura: number,
  altura: number,
  spec: ImageSpec,
): ChecagemImagem {
  // Menos da metade do recomendado aparece visivelmente borrado depois de
  // esticado para o tamanho do componente.
  if (largura < spec.width / 2 || altura < spec.height / 2) {
    return {
      ok: true,
      aviso: `Imagem pequena (${largura}×${altura}). O ideal é ${spec.width}×${spec.height} — assim ela pode aparecer borrada na loja.`,
    };
  }

  const proporcao = largura / altura;
  const ideal = spec.width / spec.height;
  // 25% de folga: diferença menor que isso não é perceptível depois do corte.
  if (Math.abs(proporcao - ideal) / ideal > 0.25) {
    return {
      ok: true,
      aviso: `Proporção diferente da recomendada (${spec.ratio}). A loja vai cortar as bordas para encaixar.`,
    };
  }

  return { ok: true };
}

/** Lê largura e altura sem subir o arquivo. */
export function lerDimensoes(file: File): Promise<{ largura: number; altura: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url); // sem isso o blob fica preso na memória da aba
      resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null); // arquivo ilegível: deixa o servidor decidir
    };
    img.src = url;
  });
}
