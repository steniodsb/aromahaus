import Link from "next/link";
import { PackageX, AlertTriangle, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, dataHoraBR } from "@/lib/utils";
import { StockAdjust } from "@/components/admin/stock-adjust";

const MOTIVO: Record<string, string> = {
  order_paid: "Venda",
  order_canceled: "Pedido cancelado",
  restock: "Entrada",
  adjustment: "Baixa manual",
  manual: "Ajuste manual",
};

interface ProdutoEstoque {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  low_stock_threshold: number;
  price: number;
  cost_price: number | null;
  is_active: boolean;
}

export default async function AdminEstoquePage(
  props: PageProps<"/admin/estoque">,
) {
  const sp = await props.searchParams;
  const filtro = typeof sp.f === "string" ? sp.f : "";

  const supabase = await createClient();

  const [{ data: produtos }, { data: movimentos }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, stock, low_stock_threshold, price, cost_price, is_active")
      .eq("is_active", true)
      .order("stock", { ascending: true }),
    supabase
      .from("stock_movements")
      .select("id, delta, balance, reason, note, created_at, product_id, products(name)")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const todos = (produtos as ProdutoEstoque[]) ?? [];

  const esgotados = todos.filter((p) => p.stock <= 0);
  const baixos = todos.filter(
    (p) => p.stock > 0 && p.low_stock_threshold > 0 && p.stock <= p.low_stock_threshold,
  );

  const lista =
    filtro === "esgotado" ? esgotados : filtro === "baixo" ? baixos : todos;

  // Só produtos com custo cadastrado entram — misturar quem não tem daria um
  // número que parece total mas não é.
  const comCusto = todos.filter((p) => p.cost_price != null);
  const capital = comCusto.reduce((s, p) => s + Number(p.cost_price) * p.stock, 0);

  const abas = [
    { v: "", rotulo: "Todos", n: todos.length },
    { v: "baixo", rotulo: "Estoque baixo", n: baixos.length },
    { v: "esgotado", rotulo: "Esgotados", n: esgotados.length },
  ];

  return (
    <div>
      <h1 className="mb-4 font-display text-3xl text-ink">Estoque</h1>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-linen-200 bg-linen-50 p-4">
          <p className="numeral text-3xl text-ink">{todos.length}</p>
          <p className="text-sm text-linen-600">Produtos ativos</p>
        </div>
        <div className={`rounded border p-4 ${baixos.length ? "border-amber-300 bg-warning/10" : "border-linen-200 bg-linen-50"}`}>
          <p className={`text-2xl font-bold ${baixos.length ? "text-warning" : "text-ink"}`}>
            {baixos.length}
          </p>
          <p className={`text-sm ${baixos.length ? "text-warning" : "text-linen-600"}`}>
            Precisam de reposição
          </p>
        </div>
        <div className="rounded border border-linen-200 bg-linen-50 p-4">
          <p className="numeral text-3xl text-ink">
            {comCusto.length ? formatBRL(capital) : "—"}
          </p>
          <p className="text-sm text-linen-600">
            {comCusto.length
              ? `Capital parado (${comCusto.length} com custo)`
              : "Cadastre o custo para ver o capital parado"}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {abas.map((a) => {
          const ativa = filtro === a.v;
          return (
            <Link
              key={a.v || "todos"}
              href={a.v ? `/admin/estoque?f=${a.v}` : "/admin/estoque"}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                ativa
                  ? "bg-champagne-600 font-semibold text-white"
                  : "border border-linen-300 text-linen-600 hover:border-champagne-500 hover:text-champagne-700"
              }`}
            >
              {a.rotulo} <span className={ativa ? "text-white/70" : "text-linen-500"}>{a.n}</span>
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-xs uppercase text-linen-600">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3 text-center">Estoque</th>
              <th className="p-3 text-center">Avisar em</th>
              <th className="p-3">Situação</th>
              <th className="p-3 text-right">Ajuste</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const esgotado = p.stock <= 0;
              const baixo = !esgotado && p.low_stock_threshold > 0 && p.stock <= p.low_stock_threshold;
              return (
                <tr key={p.id} className="border-b border-linen-100 last:border-0 hover:bg-linen-100">
                  <td className="p-3">
                    <Link href={`/admin/produtos/${p.id}`} className="font-medium text-ink hover:text-champagne-700">
                      {p.name}
                    </Link>
                    {p.sku && <p className="font-mono text-xs text-linen-500">{p.sku}</p>}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-base font-semibold ${esgotado ? "text-champagne-700" : baixo ? "text-warning" : "text-ink"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-center text-linen-500">
                    {p.low_stock_threshold > 0 ? p.low_stock_threshold : "—"}
                  </td>
                  <td className="p-3">
                    {esgotado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                        <PackageX className="h-3 w-3" /> Esgotado
                      </span>
                    ) : baixo ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Repor
                      </span>
                    ) : (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        Ok
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <StockAdjust productId={p.id} stock={p.stock} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-linen-600">
                  {filtro ? "Nada nesta situação — bom sinal." : "Nenhum produto ativo."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded border border-linen-200 bg-linen-50 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
          <History className="h-4 w-4" /> Últimas movimentações
        </h2>
        {(movimentos ?? []).length === 0 ? (
          <p className="text-sm text-linen-600">
            Nenhuma ainda. A partir de agora, toda venda, cancelamento e ajuste
            aparece aqui com o motivo.
          </p>
        ) : (
          <div className="divide-y divide-linen-100">
            {(movimentos ?? []).map((m) => {
              // O supabase-js tipa o join como array mesmo quando a relação é
              // para um só; em runtime vem objeto. Aceitamos os dois.
              const join = m.products as unknown as { name: string } | { name: string }[] | null;
              const prod = Array.isArray(join) ? join[0] : join;
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  <span
                    className={`w-12 shrink-0 text-right font-mono font-semibold ${
                      m.delta > 0 ? "text-success" : "text-champagne-700"
                    }`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-linen-800">{prod?.name ?? "produto removido"}</p>
                    <p className="text-xs text-linen-500">
                      {MOTIVO[m.reason] ?? m.reason}
                      {m.note && ` · ${m.note}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-linen-500">
                    saldo {m.balance ?? "—"} · {dataHoraBR(m.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
