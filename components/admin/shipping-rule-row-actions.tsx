"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  deleteShippingRule,
  toggleShippingRule,
} from "@/app/admin/(panel)/frete/actions";

export function ShippingRuleRowActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
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
            await toggleShippingRule(id, !isActive);
            router.refresh();
          })
        }
        className="rounded border border-linen-300 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-50"
      >
        {isActive ? "Desativar" : "Ativar"}
      </button>

      {confirming ? (
        <div className="flex items-center gap-1">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteShippingRule(id);
                router.refresh();
              })
            }
            className="rounded bg-danger text-linen-50 text-xs uppercase tracking-[0.12em] transition-opacity hover:opacity-90 px-3 py-1.5 disabled:opacity-50"
          >
            Confirmar
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
          aria-label="Excluir regra"
          className="rounded p-1.5 text-linen-500 hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
