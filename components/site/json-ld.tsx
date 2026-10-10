/**
 * Bloco de dados estruturados (schema.org) para o Google.
 *
 * Existe para centralizar UMA coisa: a serialização segura. `JSON.stringify`
 * não escapa `<`, então qualquer texto vindo do banco — nome de produto,
 * resposta do FAQ, título de post — que contenha a sequência `</script>`
 * FECHA a tag antes da hora e o resto do texto passa a ser HTML executável
 * na página. É XSS armazenado pelo caminho mais discreto possível: ninguém
 * olha o JSON-LD.
 *
 * Também escapa U+2028/U+2029, que são quebra de linha para o parser de
 * JavaScript e não para o de JSON — fonte clássica de JSON-LD inválido.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\u003c")
    .replace(/>/g, "\u003e")
    .replace(/&/g, "\u0026")
    .replace(/\u2028/g, "\u2028")
    .replace(/\u2029/g, "\u2029");

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
