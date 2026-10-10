"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
import { toggleProduct, deleteProduct } from "@/app/admin/(panel)/produtos/actions";

export function ProductRowActions({
  id,
  isActive,
  featured,
}: {
  id: string;
  isActive: boolean;
  featured: boolean;
}) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Mostra o erro da action (ex.: produto com pedidos não pode ser excluído)
  // em vez de deixar a tela como se tivesse dado certo.
  const rodar = (fn: () => Promise<{ error: string } | undefined>) =>
    start(async () => {
      setErro(null);
      const res = await fn();
      if (res?.error) setErro(res.error);
    });

  return (
    <div className="flex flex-col items-end gap-1">
    <div className="flex items-center justify-end gap-1">
      <button
        title={featured ? "Remover destaque" : "Destacar na home"}
        disabled={pending}
        onClick={() => rodar(() => toggleProduct(id, "featured", !featured))}
        className={featured ? "p-1.5 text-champagne-500" : "p-1.5 text-linen-500 hover:text-champagne-500"}
      >
        <Star className="h-4 w-4" fill={featured ? "currentColor" : "none"} />
      </button>
      <button
        title={isActive ? "Desativar" : "Ativar"}
        disabled={pending}
        onClick={() => rodar(() => toggleProduct(id, "is_active", !isActive))}
        className="p-1.5 text-linen-500 hover:text-ink"
      >
        {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <Link href={`/admin/produtos/${id}`} title="Editar" className="p-1.5 text-linen-500 hover:text-champagne-700">
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        title="Excluir"
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir este produto? Esta ação não pode ser desfeita.")) {
            rodar(() => deleteProduct(id));
          }
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
