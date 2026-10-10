import Link from "next/link";
import { Package, ShoppingBag, DollarSign, Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";

async function getStats() {
  const supabase = await createClient();
  const [products, orders, paidOrders, posts] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total").eq("status", "paid"),
    supabase.from("blog_posts").select("id", { count: "exact", head: true }),
  ]);

  const revenue =
    (paidOrders.data ?? []).reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;

  return {
    products: products.count ?? 0,
    orders: orders.count ?? 0,
    revenue,
    posts: posts.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { label: "Produtos ativos", value: stats.products, icon: Package, href: "/admin/produtos" },
    { label: "Pedidos", value: stats.orders, icon: ShoppingBag, href: "/admin/pedidos" },
    { label: "Faturamento (pago)", value: formatBRL(stats.revenue), icon: DollarSign, href: "/admin/pedidos" },
    { label: "Artigos do blog", value: stats.posts, icon: Newspaper, href: "/admin/blog" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Dashboard</h1>
      <p className="mb-6 mt-1 text-sm text-linen-600">
        Panorama rápido da loja: o que está à venda, quantos pedidos entraram e quanto já foi pago. Use os atalhos para seguir direto ao trabalho.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded border border-linen-200 bg-linen-50 p-5 transition-colors hover:border-champagne-500"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-champagne-200/45 text-champagne-700">
              <Icon className="h-5 w-5" />
            </div>
            <div className="numeral text-3xl text-ink">{value}</div>
            <div className="text-sm text-linen-600">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded border border-linen-200 bg-linen-50 p-6">
        <h2 className="mb-3 font-display text-lg text-ink">Atalhos rápidos</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/produtos/novo" className="rounded bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700">
            + Novo produto
          </Link>
          <Link href="/admin/blog/novo" className="rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink">
            + Novo artigo
          </Link>
          <Link href="/admin/config" className="rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink">
            Configurações da loja
          </Link>
        </div>
      </div>
    </div>
  );
}
