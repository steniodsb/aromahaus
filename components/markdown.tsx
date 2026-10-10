import { Fragment, type ReactNode } from "react";

/**
 * Renderizador de um subconjunto de Markdown.
 *
 * Cobre o que a loja realmente usa: títulos, parágrafos, negrito, itálico,
 * links, listas e citações. Sem tabela, imagem ou HTML embutido.
 *
 * Devolve elementos React, nunca `dangerouslySetInnerHTML` — é isso que torna
 * seguro renderizar texto vindo do painel: mesmo que alguém cole `<script>`,
 * ele sai como texto na tela, não como código.
 *
 * Existe em vez de uma biblioteca porque o conteúdo é curto e conhecido, e
 * porque as páginas do blog imprimiam o markdown cru na tela — resolver com
 * 80 linhas evita arrastar um parser inteiro para o bundle.
 */

/** Negrito, itálico, `código` e links dentro de uma linha. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Uma regex só, para os marcadores não competirem entre si: `**a**` não pode
  // ser lido como dois `*a*`, e um `_` no meio de uma URL não vira itálico.
  const re = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;

  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      out.push(
        <code key={key} className="bg-linen-100 px-1.5 py-0.5 font-mono text-[0.85em] text-linen-800">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const corte = token.indexOf("](");
      const rotulo = token.slice(1, corte);
      const href = token.slice(corte + 2, -1);
      const externo = /^https?:\/\//.test(href);
      out.push(
        <a
          key={key}
          href={href}
          className="text-champagne-700 underline underline-offset-2 transition-colors hover:text-champagne-600 hover:no-underline"
          {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {rotulo}
        </a>,
      );
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    last = m.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ content }: { content: string }) {
  // Blocos separados por linha em branco. `\r\n` entra na conta porque texto
  // colado do Word chega assim e quebraria o split.
  const blocos = content.replace(/\r\n/g, "\n").split(/\n{2,}/).filter((b) => b.trim());

  return (
    <div className="space-y-4 leading-relaxed text-linen-700">
      {blocos.map((bloco, i) => {
        const linhas = bloco.split("\n");
        const primeira = linhas[0];

        if (primeira.startsWith("### ")) {
          return (
            <h3 key={i} className="font-display pt-3 text-lg text-ink">
              {inline(primeira.slice(4), `h3-${i}`)}
            </h3>
          );
        }
        if (primeira.startsWith("## ")) {
          return (
            <h2 key={i} className="font-display pt-4 text-xl text-ink">
              {inline(primeira.slice(3), `h2-${i}`)}
            </h2>
          );
        }
        if (primeira.startsWith("# ")) {
          return (
            <h2 key={i} className="font-display pt-5 text-2xl text-ink">
              {inline(primeira.slice(2), `h1-${i}`)}
            </h2>
          );
        }
        if (primeira.startsWith("> ")) {
          return (
            <blockquote key={i} className="border-l-2 border-champagne-500 bg-linen-100 py-3 pl-4 pr-3 text-linen-700">
              {inline(linhas.map((l) => l.replace(/^>\s?/, "")).join(" "), `bq-${i}`)}
            </blockquote>
          );
        }
        if (/^[-*]\s/.test(primeira)) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {linhas.filter((l) => /^[-*]\s/.test(l)).map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-*]\s/, ""), `ul-${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (/^\d+\.\s/.test(primeira)) {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {linhas.filter((l) => /^\d+\.\s/.test(l)).map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\.\s/, ""), `ol-${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }

        // Parágrafo: quebra simples vira espaço, como manda o markdown.
        return (
          <p key={i}>
            <Fragment>{inline(linhas.join(" "), `p-${i}`)}</Fragment>
          </p>
        );
      })}
    </div>
  );
}
