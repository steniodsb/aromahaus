/**
 * Leitura das variáveis de ambiente do Supabase.
 *
 * Existe por causa de uma mensagem de erro. Sem isto, faltar uma variável no
 * deploy derruba o build com `supabaseUrl is required` apontando para uma
 * linha de um chunk minificado — não dá para saber QUAL variável falta, nem
 * onde configurá-la. Aqui o erro diz o nome e o lugar.
 *
 * As `NEXT_PUBLIC_*` são embutidas no bundle em tempo de BUILD: configurar
 * depois e só reiniciar não resolve, precisa de um novo deploy.
 */

function exigir(nome: string, valor: string | undefined): string {
  const v = (valor ?? "").trim();
  if (v) return v;
  throw new Error(
    `[Aroma Haus] A variável de ambiente ${nome} não está definida.\n` +
      `Configure-a em Vercel → Settings → Environment Variables (ou no .env.local, ` +
      `em desenvolvimento) e rode um novo deploy. As variáveis NEXT_PUBLIC_* são ` +
      `embutidas durante o build, então é preciso rebuildar depois de criá-las.`,
  );
}

export function supabaseUrl() {
  return exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey() {
  return exigir(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseServiceRoleKey() {
  return exigir(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** true quando dá para falar com o Supabase. Usado por quem falha em silêncio. */
export function supabaseConfigurado() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}
