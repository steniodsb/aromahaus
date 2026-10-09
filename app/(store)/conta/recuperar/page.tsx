"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * `useSearchParams` suspende em página prerenderizada, então precisa de um
 * boundary — sem ele o build de produção falha.
 */
export default function RecoverPasswordPage() {
  return (
    <Suspense fallback={null}>
      <RecoverPasswordForm />
    </Suspense>
  );
}

function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const linkExpirado = useSearchParams().get("erro") === "link";
  const [error, setError] = useState<string | null>(
    linkExpirado ? "O link expirou ou já foi usado. Peça um novo abaixo." : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent("/conta/nova-senha")}`,
    });
    setLoading(false);
    if (error) {
      // Não engolir a falha: sem isso um SMTP mal configurado ou um rate limit
      // do Supabase viram um falso "enviamos o link".
      console.error("[recuperar-senha]", error);
      setError(
        error.status === 429
          ? "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."
          : "Não foi possível enviar o e-mail agora. Tente novamente em instantes.",
      );
      return;
    }
    setSent(true);
  }

  const input = "w-full border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600";

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold text-ink">Verifique seu e-mail</h1>
        <p className="text-linen-600">
          Se houver uma conta com <strong>{email}</strong>, enviamos um link para
          redefinir a senha.
        </p>
        <p className="mt-2 text-sm text-linen-600">
          Não achou? Confira a caixa de spam — o link vale por 1 hora.
        </p>
        <Link href="/conta/login" className="mt-6 inline-block font-medium text-champagne-700 hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-ink">Recuperar senha</h1>
      <p className="mb-6 text-sm text-linen-600">
        Informe seu e-mail para receber o link de redefinição.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        {error && <p className="text-sm text-champagne-700">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-champagne-600 py-2.5 font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
          {loading ? "Enviando…" : "Enviar link"}
        </button>
      </form>
      <Link href="/conta/login" className="mt-4 inline-block text-sm text-linen-600 hover:text-champagne-700">
        Voltar ao login
      </Link>
    </div>
  );
}
