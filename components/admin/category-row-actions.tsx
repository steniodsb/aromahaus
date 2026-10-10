"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { toggleCategory, deleteCategory } from "@/app/admin/(panel)/categorias/actions";

export function CategoryRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Mostra o erro da action (ex.: categoria com produtos) em vez de fingir sucesso.
  const rodar = (fn: () => Promise<{ error: string } | undefined>) =>
    start(async () => {
      setErro(null);
      const res = await fn();
      if (res?.error) setErro(res.error);
    });

  return (
    <div className="flex flex-col items-end gap-1">
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/categorias/${id}`}
        title="Editar"
        className="p-1.5 text-linen-500 hover:text-ink"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        title={isActive ? "Desativar" : "Ativar"}
        disabled={pending}
        onClick={() => rodar(() => toggleCategory(id, !isActive))}
        className="p-1.5 text-linen-500 hover:text-ink"
      >
        {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button
        title="Excluir"
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir esta categoria?")) rodar(() => deleteCategory(id));
        }}
        className="p-1.5 text-linen-500 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
      {erro && <p className="max-w-[16rem] text-right text-xs text-danger">{erro}</p>}
    </div>
  );
}
