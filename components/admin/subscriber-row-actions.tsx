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
        className="rounded-lg border border-linen-300 px-2.5 py-1 text-xs text-linen-600 hover:border-champagne-500 hover:text-champagne-700 disabled:opacity-50"
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
            className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Apagar
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-linen-300 px-2.5 py-1 text-xs text-linen-600"
          >
            Não
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label="Apagar inscrito"
          title="Apagar de vez (pedido de exclusão de dados)"
          className="rounded-lg p-1.5 text-linen-500 hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
