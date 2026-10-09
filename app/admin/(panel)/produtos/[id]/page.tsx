import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, ProductVariant } from "@/lib/types";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage(
  props: PageProps<"/admin/produtos/[id]">,
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, { data: variants }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("type")
        .order("position"),
      // Inclui as inativas: o editor precisa mostrar o tamanho desligado para
      // alguém poder religá-lo.
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id)
        .order("position"),
    ]);

  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Editar produto</h1>
      <ProductForm
        product={product as Product}
        categories={(categories as Category[]) ?? []}
        variants={(variants as ProductVariant[]) ?? []}
      />
    </div>
  );
}
