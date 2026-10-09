import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { ProductForm } from "@/components/admin/product-form";

async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("type")
    .order("position");
  return (data as Category[]) ?? [];
}

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Novo produto</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
