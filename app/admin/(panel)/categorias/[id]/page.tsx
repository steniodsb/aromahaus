import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage(props: PageProps<"/admin/categorias/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: category }, { data: parentsData }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).single(),
    // Todas — o formulário remove a própria categoria e os descendentes dela.
    supabase.from("categories").select("*").order("name"),
  ]);
  if (!category) notFound();
  const parents = (parentsData as Category[]) ?? [];

  return (
    <div>
      <Link href="/admin/categorias" className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Editar categoria</h1>
      <CategoryForm category={category as Category} parents={parents} />
    </div>
  );
}
