"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const router = useRouter();

  // O cliente nasce no primeiro USO, não na renderização.
  //
  // Antes era `useState(() => createClient())`, e o inicializador do
  // `useState` roda também na renderização do servidor — o que fazia o Next
  // construir um cliente de BROWSER durante o prerender e derrubava o build
  // inteiro quando faltava uma variável de ambiente no host. A sessão de
  // recuperação só existe no browser de qualquer jeito.
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = useMemo(
    () => () => (clientRef.current ??= createClient()),
    [],
  );

  const [status, setStatus] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // A sessão de recuperação chega por cookie (via /auth/confirm) ou no
  // fragmento da URL, que o client processa ao montar. Só liberamos o form
  // depois de confirmar que ela existe.
  useEffect(() => {
    const supabase = getSupabase();
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
  }, [getSupabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) {
      setError("Não foi possível redefinir. Solicite um novo link.");
      setLoading(false);
      return;
    }
    router.push("/conta");
    router.refresh();
  }

  const input =
    "w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600";
  const label =
    "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const button =
    "w-full border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60";

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-sm px-6 py-12 text-center text-sm text-linen-700">
        Validando o link…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="mx-auto max-w-sm px-6 py-12 text-center">
        <p className="eyebrow">Recuperar senha</p>
        <h1 className="font-display-xl mt-3 text-[clamp(1.75rem,4vw,2.25rem)] text-ink">Link inválido</h1>
        <p className="mt-6 text-sm leading-relaxed text-linen-700">
          Este link de redefinição expirou ou já foi usado.
        </p>
        <Link href="/conta/recuperar" className="mt-8 inline-block text-sm text-champagne-700 hover:underline">
          Pedir um novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-12">
      <p className="eyebrow">Recuperar senha</p>
      <h1 className="font-display-xl rule mt-3 text-[clamp(1.75rem,4vw,2.25rem)] text-ink">Nova senha</h1>
      <p className="mb-8 mt-6 text-sm leading-relaxed text-linen-700">
        Escolha uma senha com pelo menos 6 caracteres.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="password" className={label}>Nova senha</label>
        <input id="password" type="password" autoComplete="new-password" required placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className={button}>
          {loading ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
