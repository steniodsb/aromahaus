import Link from "next/link";
import { Plus, Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { ProductList } from "@/components/admin/product-list";
import { ListSearch, Pagination, escapeLike } from "@/components/admin/list-toolbar";

const POR_PAGINA = 25;

export default async function AdminProductsPage(
  props: PageProps<"/admin/produtos">,
) {
  const sp = await props.searchParams;
  const busca = (typeof sp.q === "string" ? sp.q : "").trim();
  const pagina = Math.max(1, Number(typeof sp.p === "string" ? sp.p : 1) || 1);

  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (busca) {
    const termo = escapeLike(busca);
    query = query.or(`name.ilike.%${termo}%,sku.ilike.%${termo}%,slug.ilike.%${termo}%`);
  }

  const de = (pagina - 1) * POR_PAGINA;
  const { data, count } = await query.range(de, de + POR_PAGINA - 1);

  const products = (data as Product[]) ?? [];
  const total = count ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink">
          Produtos <span className="text-base font-normal text-linen-500">({total})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <ListSearch action="/admin/produtos" q={busca} placeholder="Nome, SKU ou slug" />
          <Link
            href="/admin/produtos/export"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-lg border border-linen-300 px-3 py-2 text-sm font-medium text-linen-700 hover:border-champagne-500 hover:text-champagne-700"
          >
            <Download className="h-4 w-4" /> CSV
          </Link>
          <Link
            href="/admin/produtos/importar"
            className="inline-flex items-center gap-2 rounded-lg border border-linen-300 px-3 py-2 text-sm font-medium text-linen-700 hover:border-champagne-500 hover:text-champagne-700"
          >
            <Upload className="h-4 w-4" /> Importar
          </Link>
          <Link
            href="/admin/produtos/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700"
          >
            <Plus className="h-4 w-4" /> Novo produto
          </Link>
        </div>
      </div>

      <ProductList products={products} busca={busca} />

      <Pagination
        action="/admin/produtos"
        page={pagina}
        total={total}
        perPage={POR_PAGINA}
        params={{ q: busca }}
      />
    </div>
  );
}
