import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { CategoryForm } from "@/components/admin/category-form";

export default async function NewCategoryPage() {
  const supabase = await createClient();
  // Todas as categorias, não só as de topo: sem isso não dá para aninhar
  // além do segundo nível.
  const { data } = await supabase.from("categories").select("*").order("name");
  const parents = (data as Category[]) ?? [];

  return (
    <div>
      <Link href="/admin/categorias" className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Nova categoria</h1>
      <CategoryForm parents={parents} />
    </div>
  );
}
