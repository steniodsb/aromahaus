import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { CategoryTree } from "@/components/admin/category-tree";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  const categories = (data as Category[]) ?? [];

  const principais = categories.filter((c) => !c.parent_id).length;

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl text-ink">
        Categorias{" "}
        <span className="numeral text-base text-linen-500">
          ({principais} principa{principais === 1 ? "l" : "is"} ·{" "}
          {categories.length - principais} subcategorias)
        </span>
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-linen-600">
        <strong>Categoria principal</strong> é a seção do menu da loja (por
        exemplo, Difusores ou Home sprays). <strong>Subcategoria</strong> fica
        dentro dela (por exemplo, Refis). Organize aqui como o cliente navega
        pela coleção.
      </p>

      <CategoryTree categories={categories} />
    </div>
  );
}
