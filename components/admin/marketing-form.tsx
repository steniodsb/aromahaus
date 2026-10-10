"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { saveMarketing, type MarketingState } from "@/app/admin/(panel)/marketing/actions";

/**
 * Envolve o formulário de marketing só para dar retorno ao clique — mesmo
 * padrão de `SettingsForm`. Antes era `<form action>` puro: gravava (ou
 * falhava) sem a tela dizer nada, e um erro do banco virava a página de erro
 * genérica do Next com o formulário perdido.
 *
 * Os campos chegam como `children` do server component.
 */
export function MarketingForm({ children }: { children: React.ReactNode }) {
  const [estado, formAction, pending] = useActionState<MarketingState | null, FormData>(
    saveMarketing,
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
          {pending ? "Salvando…" : "Salvar"}
        </button>

        {/* `key` no timestamp: sem ele, salvar duas vezes seguidas não
            re-renderiza a mensagem e o aviso parece não ter atualizado. */}
        {!pending && estado?.ok && (
          <span key={estado.at} className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Marketing salvo
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
