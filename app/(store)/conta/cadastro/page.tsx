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

  const input = "w-full border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600";

  if (done === "confirm") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold text-ink">Confirme seu e-mail</h1>
        <p className="text-linen-600">
          Enviamos um link de confirmação para <strong>{form.email}</strong>.
          Abra o e-mail para ativar sua conta e depois faça login.
        </p>
        <Link href={`/conta/login?redirect=${encodeURIComponent(redirect)}`} className="mt-6 inline-block font-medium text-champagne-700 hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-ink">Criar conta</h1>
      <p className="mb-6 text-sm text-linen-600">Acompanhe seus pedidos na Aroma Haus.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-linen-700">Nome completo</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-linen-700">E-mail</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-linen-700">Senha</label>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
        </div>
        {error && <p className="text-sm text-champagne-700">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-champagne-600 py-2.5 font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
          {loading ? "Criando…" : "Criar conta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-linen-600">
        Já tem conta?{" "}
        <Link href={`/conta/login?redirect=${encodeURIComponent(redirect)}`} className="font-medium text-champagne-700 hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
