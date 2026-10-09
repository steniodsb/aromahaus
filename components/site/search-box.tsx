"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/produtos?q=${encodeURIComponent(term)}` : "/produtos");
  }

  return (
    <form onSubmit={submit} className={`relative ${className}`}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar fragrância ou produto"
        aria-label="Buscar na loja"
        className="w-full rounded-full border border-white/15 bg-white/[0.07] py-2.5 pl-10 pr-4 text-sm text-linen-100 outline-none transition-colors placeholder:text-linen-400 focus:border-champagne-500 focus:bg-white/10"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-linen-300 transition-colors hover:text-champagne-300"
      >
        <Search className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </form>
  );
}
