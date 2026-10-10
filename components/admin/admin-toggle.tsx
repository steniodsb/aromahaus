"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdmin } from "@/app/admin/(panel)/equipe/actions";

export function AdminToggle({
  userId,
  isAdmin,
  ehVoce,
}: {
  userId: string;
  isAdmin: boolean;
  ehVoce: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (ehVoce && isAdmin) {
    return <span className="text-xs text-linen-600">é você</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await setAdmin(userId, !isAdmin);
            if (res?.error) setError(res.error);
            else router.refresh();
          })
        }
        className={
          isAdmin
            ? "rounded border border-linen-300 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-50"
            : "rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-3 py-1.5 hover:bg-champagne-700 disabled:opacity-50"
        }
      >
        {isAdmin ? "Remover admin" : "Tornar admin"}
      </button>
      {error && <p className="max-w-[16rem] text-right text-xs text-danger">{error}</p>}
    </div>
  );
}
