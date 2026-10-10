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

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setSubscriberStatus(
              id,
              status === "subscribed" ? "unsubscribed" : "subscribed",
            );
            router.refresh();
          })
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
              startTransition(async () => {
                await deleteSubscriber(id);
                router.refresh();
              })
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
  );
}
