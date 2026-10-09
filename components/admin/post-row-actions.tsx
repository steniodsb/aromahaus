"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deletePost } from "@/app/admin/(panel)/blog/actions";

export function PostRowActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/blog/${id}`} title="Editar" className="p-1.5 text-linen-500 hover:text-champagne-700">
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        title="Excluir"
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir este artigo?")) start(() => deletePost(id));
        }}
        className="p-1.5 text-linen-500 hover:text-champagne-700"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
