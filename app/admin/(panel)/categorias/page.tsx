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
      <h1 className="mb-2 font-display text-3xl text-ink">
        Categorias{" "}
        <span className="text-base font-normal text-linen-500">
          ({principais} principa{principais === 1 ? "l" : "is"} ·{" "}
          {categories.length - principais} subcategorias)
        </span>
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-linen-600">
        <strong>Categoria principal</strong> é a seção que aparece no menu da
        loja. <strong>Subcategoria</strong> fica dentro dela. Para criar o que
        antes se chamava &ldquo;tipo&rdquo;, crie uma categoria principal — é a
        mesma coisa, e agora sem campo duplicado.
      </p>

      <CategoryTree categories={categories} />
    </div>
  );
}
