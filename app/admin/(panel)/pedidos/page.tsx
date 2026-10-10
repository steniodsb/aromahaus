import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListSearch, Pagination, escapeLike } from "@/components/admin/list-toolbar";
import { OrderList, type OrderRow } from "@/components/admin/order-list";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

const POR_PAGINA = 50;

const COLUNAS =
  "id,customer_name,customer_email,total,discount,status,created_at,payment_method_kind,coupon_code,tracking_code,shipping_service,shipping_service_id,melhorenvio_order_id,archived_at";

export default async function AdminOrdersPage(
  props: PageProps<"/admin/pedidos">,
) {
  const sp = await props.searchParams;
  const statusFiltro = typeof sp.status === "string" ? sp.status : "";
  const busca = (typeof sp.q === "string" ? sp.q : "").trim();
  const arquivados = sp.arquivados === "1";
  const pagina = Math.max(1, Number(typeof sp.p === "string" ? sp.p : 1) || 1);

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(COLUNAS, { count: "exact" })
    .order("created_at", { ascending: false });

  // Arquivado só aparece na própria aba — é o ponto do arquivamento.
  query = arquivados
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  if (statusFiltro) query = query.eq("status", statusFiltro);

  if (busca) {
    const termo = escapeLike(busca);
    query = query.or(
      `customer_name.ilike.%${termo}%,customer_email.ilike.%${termo}%,tracking_code.ilike.%${termo}%`,
    );
  }

  const de = (pagina - 1) * POR_PAGINA;
  const primeira = await query.range(de, de + POR_PAGINA - 1);
  const error = primeira.error;
  let data = primeira.data;
  let count = primeira.count;

  // A migração 0009 pode não ter rodado ainda (o deploy chega antes do SQL).
  // Sem `archived_at` a consulta inteira falha e a tela de pedidos — a mais
  // importante do painel — ficaria vazia. Aqui ela recua para a versão sem
  // arquivamento em vez de quebrar.
  const semColunaArquivo = error?.code === "42703";
  if (semColunaArquivo) {
    let simples = supabase
      .from("orders")
      .select(COLUNAS.replace(",archived_at", ""), { count: "exact" })
      .order("created_at", { ascending: false });
    if (statusFiltro) simples = simples.eq("status", statusFiltro);
    if (busca) {
      const termo = escapeLike(busca);
      simples = simples.or(
        `customer_name.ilike.%${termo}%,customer_email.ilike.%${termo}%,tracking_code.ilike.%${termo}%`,
      );
    }
    const alt = await simples.range(de, de + POR_PAGINA - 1);
    data = alt.data as unknown as typeof data;
    count = alt.count;
  }

  const orders = ((data as unknown as OrderRow[]) ?? []).map((o) => ({
    ...o,
    archived_at: o.archived_at ?? null,
  }));
  const total = count ?? 0;

  // Contagem por status sobre os NÃO arquivados, para as abas refletirem a
  // fila de trabalho real e não o histórico inteiro.
  const { data: todosRaw } = await supabase
    .from("orders")
    .select(semColunaArquivo ? "status" : "status, archived_at");
  const todos = (todosRaw ?? []) as unknown as {
    status: string;
    archived_at?: string | null;
  }[];
  const ativos = todos.filter((o) => !o.archived_at);
  const contagem = ativos.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalAtivos = ativos.length;
  const totalArquivados = todos.length - totalAtivos;

  const abas = [
    { valor: "", rotulo: "Todos", n: totalAtivos },
    ...Object.keys(STATUS_LABEL).map((s) => ({
      valor: s,
      rotulo: STATUS_LABEL[s],
      n: contagem[s] ?? 0,
    })),
  ];

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (statusFiltro) p.set("status", statusFiltro);
    if (busca) p.set("q", busca);
    if (arquivados) p.set("arquivados", "1");
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `/admin/pedidos?${s}` : "/admin/pedidos";
  };

  const aba = (ativa: boolean) =>
    `rounded px-3 py-1 text-sm transition-colors ${
      ativa
        ? "bg-linen-900 text-linen-50"
        : "border border-linen-300 text-linen-600 transition-colors hover:border-linen-900 hover:text-ink"
    }`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">
            {arquivados ? "Pedidos arquivados" : "Pedidos"}{" "}
            <span className="numeral text-base text-linen-500">({total})</span>
          </h1>
          <p className="mt-1 text-sm text-linen-600">
            {arquivados
              ? "Pedidos tirados da fila. Desarquive para voltar a trabalhar neles."
              : "Fila de trabalho: confirme o pagamento, gere a etiqueta e acompanhe o envio de cada pedido."}
          </p>
        </div>
        <ListSearch
          action="/admin/pedidos"
          q={busca}
          placeholder="Nome, e-mail ou rastreio"
          extra={{ status: statusFiltro, arquivados: arquivados ? "1" : "" }}
        />
      </div>

      {!arquivados && (
        <div className="mb-3 flex flex-wrap gap-2">
          {abas.map((a) => (
            <Link
              key={a.valor || "todos"}
              href={qs({ status: a.valor, p: "" })}
              className={aba(statusFiltro === a.valor)}
            >
              {a.rotulo}{" "}
              <span className={`numeral ${statusFiltro === a.valor ? "text-linen-50/70" : "text-linen-500"}`}>
                {a.n}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Arquivados fora das abas de status: é outro modo de ver a lista, não
          mais um filtro que se combina com os demais. */}
      <div className="mb-4">
        {arquivados ? (
          <Link href="/admin/pedidos" className="text-sm text-champagne-700 hover:underline">
            ← Voltar aos pedidos ativos
          </Link>
        ) : (
          totalArquivados > 0 && (
            <Link
              href="/admin/pedidos?arquivados=1"
              className="text-sm text-linen-600 hover:text-champagne-700"
            >
              Ver <span className="numeral">{totalArquivados}</span> arquivado{totalArquivados > 1 ? "s" : ""} →
            </Link>
          )
        )}
      </div>

      {semColunaArquivo && (
        <p className="mb-3 rounded bg-warning/10 px-4 py-2 text-sm text-warning">
          Arquivar ainda não está disponível: falta rodar a migração{" "}
          <code className="font-mono">0009_pedidos_arquivar.sql</code>. O resto
          da tela funciona normalmente.
        </p>
      )}

      <OrderList orders={orders} busca={busca} arquivados={arquivados} />

      <Pagination
        action="/admin/pedidos"
        page={pagina}
        total={total}
        perPage={POR_PAGINA}
        params={{ q: busca, status: statusFiltro, arquivados: arquivados ? "1" : "" }}
      />
    </div>
  );
}
