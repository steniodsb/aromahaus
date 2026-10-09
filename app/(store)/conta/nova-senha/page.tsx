"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // A sessão de recuperação chega por cookie (via /auth/confirm) ou no
  // fragmento da URL, que o client processa ao montar. Só liberamos o form
  // depois de confirmar que ela existe.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setStatus("ok");
    });
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setStatus(session ? "ok" : "invalid");
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("Não foi possível redefinir. Solicite um novo link.");
      setLoading(false);
      return;
    }
    router.push("/conta");
    router.refresh();
  }

  const input = "w-full border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600";

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center text-linen-600">
        Validando o link…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold text-ink">Link inválido</h1>
        <p className="text-linen-600">
          Este link de redefinição expirou ou já foi usado.
        </p>
        <Link href="/conta/recuperar" className="mt-6 inline-block font-medium text-champagne-700 hover:underline">
          Pedir um novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-ink">Nova senha</h1>
      <p className="mb-6 text-sm text-linen-600">Defina uma nova senha para sua conta.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" required placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        {error && <p className="text-sm text-champagne-700">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-champagne-600 py-2.5 font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
          {loading ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
