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
    return <span className="text-xs text-linen-500">é você</span>;
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
            ? "rounded-lg border border-linen-300 px-2.5 py-1 text-xs text-linen-600 hover:border-champagne-500 hover:text-champagne-700 disabled:opacity-50"
            : "rounded-lg bg-champagne-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-champagne-700 disabled:opacity-50"
        }
      >
        {isAdmin ? "Remover admin" : "Tornar admin"}
      </button>
      {error && <p className="max-w-[16rem] text-right text-xs text-champagne-700">{error}</p>}
    </div>
  );
}
