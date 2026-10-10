import { createClient } from "@/lib/supabase/server";

/**
 * Catálogo em CSV.
 *
 * Serve para dois usos reais: conferir preço e estoque numa planilha, e ter
 * uma cópia do catálogo fora do Supabase.
 *
 * É rota, não server action, porque download precisa de `Content-Disposition`.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return new Response("Não autorizado", { status: 403 });

  const [{ data: produtos, error }, { data: categorias }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "sku, name, slug, price, compare_at_price, cost_price, stock, low_stock_threshold, weight_g, width_cm, height_cm, length_cm, is_active, featured, category_id, description",
      )
      .order("name"),
    supabase.from("categories").select("id, name"),
  ]);

  if (error) return new Response(error.message, { status: 500 });

  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.id, c.name]));

  const cell = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    // Descrição tem quebra de linha e vírgula; sem aspas, uma célula vira
    // várias colunas e o resto da planilha desanda.
    return /[",\n;\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const cabecalho = [
    "sku", "nome", "slug", "preco", "preco_comparativo", "custo",
    "estoque", "avisar_abaixo_de", "peso_g", "largura_cm", "altura_cm",
    "comprimento_cm", "ativo", "destaque", "categoria", "descricao",
  ];

  const linhas = [
    cabecalho.join(","),
    ...(produtos ?? []).map((p) =>
      [
        p.sku, p.name, p.slug, p.price, p.compare_at_price, p.cost_price,
        p.stock, p.low_stock_threshold, p.weight_g, p.width_cm, p.height_cm,
        p.length_cm, p.is_active ? "sim" : "nao", p.featured ? "sim" : "nao",
        nomeCategoria.get(p.category_id ?? "") ?? "", p.description,
      ].map(cell).join(","),
    ),
  ];

  // BOM para o Excel abrir os acentos certos.
  const csv = "﻿" + linhas.join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produtos-aromahaus-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
