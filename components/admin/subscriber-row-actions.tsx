"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  setSubscriberStatus,
  deleteSubscriber,
} from "@/app/admin/(panel)/newsletter/actions";

export function SubscriberRowActions({
  id,
  status,
}: {
  id: string;
  status: "subscribed" | "unsubscribed";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Roda a action e só atualiza a tela se deu certo; se falhou, mostra o motivo
  // (chave estrangeira, permissão etc.) em vez de fingir que funcionou.
  function rodar(fn: () => Promise<{ error: string } | undefined>) {
    startTransition(async () => {
      setErro(null);
      const res = await fn();
      if (res?.error) {
        setErro(res.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
    <div className="flex items-center justify-end gap-2">
      <button
        disabled={pending}
        onClick={() =>
          rodar(() => setSubscriberStatus(id, status === "subscribed" ? "unsubscribed" : "subscribed"))
        }
        className="rounded border border-linen-300 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-50"
      >
        {status === "subscribed" ? "Descadastrar" : "Reinscrever"}
      </button>

      {confirming ? (
        <div className="flex items-center gap-1">
          <button
            disabled={pending}
            onClick={() =>
              rodar(() => deleteSubscriber(id))
            }
            className="rounded bg-danger text-linen-50 text-xs uppercase tracking-[0.12em] transition-opacity hover:opacity-90 px-3 py-1.5 disabled:opacity-50"
          >
            Apagar
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded border border-linen-300 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
          >
            Não
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label="Apagar inscrito"
          title="Apagar de vez (pedido de exclusão de dados)"
          className="rounded p-1.5 text-linen-500 hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
      {erro && <p className="max-w-[16rem] text-right text-xs text-danger">{erro}</p>}
    </div>
  );
}
