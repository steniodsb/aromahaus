"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) {
      setMsg({ type: "err", text: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (password !== confirm) {
      setMsg({ type: "err", text: "As senhas não conferem." });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMsg({ type: "err", text: "Não foi possível alterar a senha." });
      return;
    }
    setPassword("");
    setConfirm("");
    setMsg({ type: "ok", text: "Senha alterada com sucesso." });
  }

  const input = "w-full rounded-lg border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600";
  const label = "mb-1 block text-sm font-medium text-linen-700";

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className={label}>Nova senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </div>
      <div>
        <label className={label}>Confirmar nova senha</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
      </div>
      {msg && (
        <p className={msg.type === "ok" ? "text-sm text-success" : "text-sm text-champagne-700"}>{msg.text}</p>
      )}
      <button type="submit" disabled={loading} className="rounded-lg bg-champagne-600 px-6 py-2.5 font-semibold text-white hover:bg-champagne-700 disabled:opacity-60">
        {loading ? "Salvando…" : "Alterar senha"}
      </button>
    </form>
  );
}
