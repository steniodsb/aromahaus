"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/wishlist";
import { cn } from "@/lib/utils";

/**
 * Coração de favoritar.
 *
 * O estado vira na hora (otimista) e volta atrás se o servidor recusar: o
 * clique de favoritar não vale a espera de uma ida ao banco. Visitante sem
 * conta é mandado para o login com o endereço de volta na bagagem.
 */
export function WishlistButton({
  productId,
  initialSaved = false,
  variant = "icon",
  className,
}: {
  productId: string;
  initialSaved?: boolean;
  /** `icon` para o card; `label` para a página de produto. */
  variant?: "icon" | "label";
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function handle(e: React.MouseEvent) {
    // O card inteiro é um link; sem isto o clique navega em vez de favoritar.
    e.preventDefault();
    e.stopPropagation();

    const next = !saved;
    setSaved(next);

    start(async () => {
      const res = await toggleWishlist(productId);
      if (res.needsAuth) {
        setSaved(!next);
        router.push(`/conta/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!res.ok) setSaved(!next);
      else setSaved(Boolean(res.saved));
    });
  }

  const label = saved ? "Remover da lista de desejos" : "Salvar na lista de desejos";

  if (variant === "label") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        aria-pressed={saved}
        className={cn(
          "inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] transition-colors",
          saved ? "text-champagne-700" : "text-linen-600 hover:text-ink",
          className,
        )}
      >
        <Heart
          className="h-4 w-4"
          strokeWidth={1.4}
          fill={saved ? "currentColor" : "none"}
        />
        {saved ? "Na sua lista" : "Salvar na lista"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-label={label}
      aria-pressed={saved}
      title={label}
      className={cn(
        "grid h-9 w-9 place-items-center bg-linen-50/85 backdrop-blur-sm transition-colors",
        saved ? "text-champagne-700" : "text-linen-600 hover:text-ink",
        className,
      )}
    >
      <Heart
        className="h-[1.05rem] w-[1.05rem]"
        strokeWidth={1.4}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
