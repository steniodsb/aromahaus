/**
 * Retorno padrão das server actions de formulário do admin.
 *
 * As actions **retornam** o erro em vez de lançar. Lançar deixava o admin numa
 * tela de erro genérica do Next, sem mensagem e com o formulário perdido — um
 * slug repetido bastava para isso acontecer. Devolvendo, cada formulário mostra
 * o motivo e o que foi digitado continua lá.
 *
 * `undefined` = deu certo. Nesse caso a action chama `redirect()`, sempre fora
 * de qualquer `try` (o `redirect` do Next funciona lançando `NEXT_REDIRECT`, e
 * um `catch` no caminho engoliria a navegação).
 */
export type FormResult = { error: string } | undefined;

/**
 * Traduz o erro cru do Postgres para algo acionável no painel.
 *
 * "duplicate key value violates unique constraint idx_coupons_code" não diz
 * nada para quem só quer saber que o código já existe.
 */
export function traduzErro(message: string): string {
  if (/idx_coupons_code/.test(message)) return "Já existe um cupom com esse código.";
  if (/products_slug_key|categories_slug_key|blog_posts_slug_key/.test(message)) {
    return "Já existe um registro com esse slug (URL). Escolha outro.";
  }
  if (/duplicate key/i.test(message)) return "Já existe um registro com esse valor único.";
  if (/violates foreign key/i.test(message)) {
    return "Este registro está em uso por outro (categoria com produtos, por exemplo).";
  }
  if (/violates check constraint/i.test(message)) return "Algum valor está fora do permitido.";
  if (/row-level security/i.test(message)) return "Sem permissão. Faça login como admin de novo.";
  return message;
}
