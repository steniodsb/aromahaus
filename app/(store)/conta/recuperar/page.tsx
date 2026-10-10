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

  const input =
    "w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-linen-500 focus:border-champagne-600";
  const label =
    "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const button =
    "w-full border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60";

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-6 py-12 text-center">
        <p className="eyebrow">Recuperar senha</p>
        <h1 className="font-display-xl mt-3 text-[clamp(1.75rem,4vw,2.25rem)] text-ink">Verifique seu e-mail</h1>
        <p className="mt-6 text-sm leading-relaxed text-linen-700">
          Se houver uma conta com <span className="text-ink">{email}</span>, enviamos um link para
          redefinir a senha.
        </p>
        <p className="mt-2 text-sm text-linen-600">
          Não achou? Confira a caixa de spam — o link vale por 1 hora.
        </p>
        <Link href="/conta/login" className="mt-8 inline-block text-sm text-champagne-700 hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-12">
      <p className="eyebrow">Minha conta</p>
      <h1 className="font-display-xl rule mt-3 text-[clamp(1.75rem,4vw,2.25rem)] text-ink">Recuperar senha</h1>
      <p className="mb-8 mt-6 text-sm leading-relaxed text-linen-700">
        Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="email" className={label}>E-mail</label>
        <input id="email" type="email" autoComplete="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className={button}>
          {loading ? "Enviando…" : "Enviar link"}
        </button>
      </form>
      <Link href="/conta/login" className="mt-6 inline-block text-sm text-linen-700 transition-colors hover:text-champagne-700">
        Voltar ao login
      </Link>
    </div>
  );
}
