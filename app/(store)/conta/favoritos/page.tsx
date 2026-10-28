import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWishlist, withProductDetails } from "@/lib/queries";
import { ProductCard } from "@/components/store/product-card";

export const metadata: Metadata = {
  title: "Lista de desejos",
  robots: { index: false },
};

export default async function FavoritosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/conta/login?redirect=/conta/favoritos");

  const products = await withProductDetails(await getWishlist());

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <nav className="mb-6 text-[0.6875rem] uppercase tracking-[0.14em] text-linen-500">
        <Link href="/conta" className="transition-colors hover:text-champagne-700">
          Minha conta
        </Link>
        <span className="mx-2.5">/</span>
        <span className="text-linen-700">Lista de desejos</span>
      </nav>

      <h1 className="font-display-xl rule mb-10 text-[clamp(2rem,4.5vw,3rem)] text-ink">
        Lista de desejos
      </h1>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((p) => (
            // Todos aqui estão salvos por definição — o coração nasce pintado,
            // e desmarcar tira o item da lista na próxima visita.
            <ProductCard key={p.id} product={p} saved />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-linen-300 px-6 py-20 text-center">
          <Heart
            className="mx-auto mb-5 h-8 w-8 text-linen-300"
            strokeWidth={1}
          />
          <p className="font-display text-2xl text-ink">Nada salvo ainda</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-linen-700">
            Toque no coração de qualquer produto para guardá-lo aqui e decidir
            com calma depois.
          </p>
          <Link
            href="/produtos"
            className="mt-8 inline-block border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
          >
            Ver fragrâncias
          </Link>
        </div>
      )}
    </div>
  );
}
