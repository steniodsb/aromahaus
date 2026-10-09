"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { cn } from "@/lib/utils";

export function CartBadge({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { count, isReady } = useCart();
  const light = tone === "light";

  return (
    <Link
      href="/carrinho"
      aria-label={count > 0 ? `Sacola com ${count} item(ns)` : "Sacola"}
      className={cn(
        "relative transition-colors",
        light
          ? "text-linen-200 hover:text-champagne-300"
          : "text-linen-700 hover:text-champagne-600",
      )}
    >
      <ShoppingBag className="h-[1.2rem] w-[1.2rem]" strokeWidth={1.4} />
      {isReady && count > 0 && (
        <span className="absolute -right-2.5 -top-2 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-champagne-500 px-1 text-[0.625rem] font-medium text-linen-900">
          {count}
        </span>
      )}
    </Link>
  );
}
