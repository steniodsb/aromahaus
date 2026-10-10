/**
 * Gera supabase/APLICAR.sql: todas as migrações numa única query.
 *
 * Existe porque o MCP do Supabase não tem acesso a este projeto, então quem
 * aplica o banco é o lojista, colando um arquivo no SQL Editor. Juntar à mão
 * treze arquivos é onde se esquece o último — foi o que aconteceu com a 0013.
 *
 *   node scripts/gerar-aplicar-sql.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const SAIDA = "supabase/APLICAR.sql";

const arquivos = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const cabecalho = `-- ============================================================================
-- AROMA HAUS — banco completo, em um arquivo só
--
-- COMO USAR
--   1. Abra o projeto no Supabase → SQL Editor → New query.
--   2. Cole este arquivo inteiro e rode (Run).
--   3. Crie sua conta na loja em /conta/cadastro e depois rode:
--        update public.profiles set is_admin = true where id = '<seu-user-id>';
--      O id está em Authentication → Users.
--
-- É só a concatenação das migrações de supabase/migrations/, na ordem.
-- Idempotente: rodar de novo não duplica nada.
-- Gerado por scripts/gerar-aplicar-sql.mjs — não edite aqui, edite as migrações.
-- ============================================================================
`;

const corpo = arquivos
  .map((nome) => {
    const barra = "=".repeat(Math.max(4, 68 - nome.length));
    return `\n-- ===== ${nome} ${barra}\n${readFileSync(join(DIR, nome), "utf8").trimEnd()}\n`;
  })
  .join("\n");

writeFileSync(SAIDA, cabecalho + corpo, "utf8");
console.log(`${SAIDA}: ${arquivos.length} migrações, ${arquivos.at(-1)} por último.`);
