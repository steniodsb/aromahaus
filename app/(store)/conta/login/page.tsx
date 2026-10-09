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

  const input = "w-full border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600";

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-ink">Entrar</h1>
      <p className="mb-6 text-sm text-linen-600">Acesse sua conta Aroma Haus.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-linen-700">E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-linen-700">Senha</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </div>
        {error && <p className="text-sm text-champagne-700">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-champagne-600 py-2.5 font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link href="/conta/recuperar" className="text-linen-600 hover:text-champagne-700">Esqueci a senha</Link>
        <Link href={`/conta/cadastro?redirect=${encodeURIComponent(redirect)}`} className="font-medium text-champagne-700 hover:underline">Criar conta</Link>
      </div>
    </div>
  );
}
