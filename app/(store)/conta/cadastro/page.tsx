"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { notifyWelcome } from "@/app/actions/account";

function safeRedirect(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/conta";
}

/** Boundary exigido por `useSearchParams` em página prerenderizada (Next 16). */
export default function CustomerSignupPage() {
  return (
    <Suspense fallback={null}>
      <CustomerSignupForm />
    </Suspense>
  );
}

function CustomerSignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"confirm" | null>(null);
  const [loading, setLoading] = useState(false);
  const redirect = safeRedirect(useSearchParams().get("redirect"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    });
    if (error) {
      setError(error.message.includes("registered") ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta.");
      setLoading(false);
      return;
    }
    // Se a confirmação de e-mail estiver desativada, já vem sessão
    if (data.session) {
      void notifyWelcome({ name: form.name, email: form.email });
      router.push(redirect);
      router.refresh();
    } else {
      setDone("confirm");
      setLoading(false);
    }
  }

  const input =
    "w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600";
  const label =
    "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const button =
    "w-full border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60";

  if (done === "confirm") {
    return (
      <div className="mx-auto max-w-sm px-6 py-12 text-center">
        <p className="eyebrow">Quase lá</p>
        <h1 className="font-display-xl mt-3 text-[clamp(1.75rem,4vw,2.25rem)] text-ink">Confirme seu e-mail</h1>
        <p className="mt-6 text-sm leading-relaxed text-linen-700">
          Enviamos um link de confirmação para <span className="text-ink">{form.email}</span>.
          Abra o e-mail para ativar sua conta e depois faça login.
        </p>
        <Link href={`/conta/login?redirect=${encodeURIComponent(redirect)}`} className="mt-8 inline-block text-sm text-champagne-700 hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-12">
      <p className="eyebrow">Minha conta</p>
      <h1 className="font-display-xl rule mt-3 text-[clamp(1.75rem,4vw,2.25rem)] text-ink">Criar conta</h1>
      <p className="mb-8 mt-6 text-sm leading-relaxed text-linen-700">
        Acompanhe seus pedidos e guarde seus aromas favoritos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className={label}>Nome completo</label>
          <input id="name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        </div>
        <div>
          <label htmlFor="email" className={label}>E-mail</label>
          <input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
        </div>
        <div>
          <label htmlFor="password" className={label}>Senha</label>
          <input id="password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className={button}>
          {loading ? "Criando…" : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-linen-700">
        Já tem conta?{" "}
        <Link href={`/conta/login?redirect=${encodeURIComponent(redirect)}`} className="text-champagne-700 hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
