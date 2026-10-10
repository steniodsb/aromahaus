"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function safeRedirect(value: string | null): string {
  // Só aceita caminhos internos (evita open-redirect).
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/conta";
}

/**
 * `useSearchParams` suspende em página prerenderizada, então precisa de um
 * boundary — sem ele o build de produção falha. Ver docs do Next 16:
 * 01-app/03-api-reference/04-functions/use-search-params.md.
 */
export default function CustomerLoginPage() {
  return (
    <Suspense fallback={null}>
      <CustomerLoginForm />
    </Suspense>
  );
}

function CustomerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const redirect = safeRedirect(useSearchParams().get("redirect"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  const input =
    "w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600";
  const label =
    "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const button =
    "w-full border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60";

  return (
    <div className="mx-auto max-w-sm px-6 py-12">
      <p className="eyebrow">Minha conta</p>
      <h1 className="font-display-xl rule mt-3 text-[clamp(1.75rem,4vw,2.25rem)] text-ink">Entrar</h1>
      <p className="mb-8 mt-6 text-sm leading-relaxed text-linen-700">
        Acompanhe seus pedidos e acesse sua lista de desejos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={label}>E-mail</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="password" className={label}>Senha</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className={button}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="mt-6 flex justify-between text-sm">
        <Link href="/conta/recuperar" className="text-linen-700 transition-colors hover:text-champagne-700">Esqueci a senha</Link>
        <Link href={`/conta/cadastro?redirect=${encodeURIComponent(redirect)}`} className="text-champagne-700 hover:underline">Criar conta</Link>
      </div>
    </div>
  );
}
