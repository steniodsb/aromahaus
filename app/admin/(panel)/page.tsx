import Link from "next/link";
import { Package, ShoppingBag, DollarSign, Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";

// Pedido que já foi pago e segue o fluxo continua sendo faturamento: "enviado" e
// "entregue" são estágios DEPOIS de "pago". Contar só `paid` fazia o número
// cair quanto mais rápido a loja despachava. Mesmo critério da tela de Clientes.
const STATUS_FATURADOS = ["paid", "shipped", "delivered"];

async function getStats() {
  const supabase = await createClient();
  // Card "Pedidos": exclui cancelados e reembolsados (não são venda), mas MANTÉM
  // os pendentes, que aparecem separados na linha de baixo — assim o total não
  // infla com carrinho abandonado e quem lê ainda vê quanto espera pagamento.
  const [products, orders, pendingOrders, billedOrders, posts] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(canceled,refunded)"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("total").in("status", STATUS_FATURADOS),
    supabase.from("blog_posts").select("id", { count: "exact", head: true }),
  ]);

  const revenue =
    (billedOrders.data ?? []).reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;

  return {
    products: products.count ?? 0,
    orders: orders.count ?? 0,
    pending: pendingOrders.count ?? 0,
    revenue,
    posts: posts.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { label: "Produtos ativos", value: stats.products, icon: Package, href: "/admin/produtos" },
    {
      label: "Pedidos (sem cancelados)",
      value: stats.orders,
      hint: `${stats.pending} aguardando pagamento`,
      icon: ShoppingBag,
      href: "/admin/pedidos",
    },
    {
      label: "Faturamento",
      value: formatBRL(stats.revenue),
      hint: "Pedidos pagos, enviados e entregues",
      icon: DollarSign,
      href: "/admin/pedidos",
    },
    { label: "Artigos do blog", value: stats.posts, icon: Newspaper, href: "/admin/blog" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Dashboard</h1>
      <p className="mb-6 mt-1 text-sm text-linen-600">
        Panorama rápido da loja: o que está à venda, quantos pedidos entraram e quanto já foi faturado. Use os atalhos para seguir direto ao trabalho.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, href }) => (
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
            {hint && <div className="mt-0.5 text-xs text-linen-500">{hint}</div>}
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
