"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { saveSettings, type SettingsState } from "@/app/admin/(panel)/config/actions";

/**
 * Envolve o formulário de configurações só para dar retorno ao clique.
 *
 * Antes era um `<form action={saveSettings}>` puro: salvava de verdade, mas a
 * tela ficava idêntica — sem "salvando", sem confirmação, sem erro. Do lado de
 * quem usa, é indistinguível de um botão quebrado, e o reflexo é clicar de
 * novo achando que não pegou.
 *
 * Os campos chegam como `children` do server component, então continuam sendo
 * renderizados no servidor — só o botão e o aviso vivem no cliente.
 */
export function SettingsForm({ children }: { children: React.ReactNode }) {
  const [estado, formAction, pending] = useActionState<SettingsState | null, FormData>(
    saveSettings,
    null,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {children}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar configurações"}
        </button>

        {/* `key` no timestamp: sem ele, salvar duas vezes seguidas não
            re-renderiza a mensagem e o aviso parece não ter atualizado. */}
        {!pending && estado?.ok && (
          <span
            key={estado.at}
            className="flex items-center gap-1.5 text-sm text-success"
          >
            <CheckCircle2 className="h-4 w-4" /> Configurações salvas
          </span>
        )}

        {!pending && estado && !estado.ok && (
          <span className="rounded bg-danger/10 px-3 py-1.5 text-sm text-danger">
            {estado.error ?? "Não consegui salvar."}
          </span>
        )}
      </div>
    </form>
  );
}
