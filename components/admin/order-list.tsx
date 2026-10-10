"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Ticket, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { formatBRL, dataBR, horaBR } from "@/lib/utils";
import { arquivarPedidos, excluirPedidos } from "@/app/admin/(panel)/pedidos/actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  shipped: "bg-champagne-200 text-champagne-700",
  delivered: "bg-success/15 text-success",
  canceled: "bg-linen-200 text-linen-600",
  refunded: "bg-lilac-100 text-lilac-600",
};

const MEIO_LABEL: Record<string, string> = {
  pix: "Pix", card: "Cartão", boleto: "Boleto",
};

export interface OrderRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  discount: number;
  status: string;
  created_at: string;
  payment_method_kind: string | null;
  coupon_code: string | null;
  tracking_code: string | null;
  shipping_service: string | null;
  shipping_service_id: string | null;
  melhorenvio_order_id: string | null;
  archived_at: string | null;
}

/**
 * Lista de pedidos com seleção e ações em lote.
 *
 * Vive no cliente por causa da seleção. Busca, filtro e paginação continuam na
 * URL, no servidor — um link para "página 2 dos pagos" precisa continuar
 * funcionando.
 */
export function OrderList({
  orders,
  busca,
  arquivados,
}: {
  orders: OrderRow[];
  busca: string;
  /** true quando a aba "Arquivados" está aberta. */
  arquivados: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sel, setSel] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const ids = orders.map((o) => o.id);
  const todosMarcados = ids.length > 0 && ids.every((id) => sel.includes(id));

  // Pago ou com etiqueta não pode ser excluído — a regra vive no servidor,
  // mas a tela precisa saber para não oferecer um botão que só pode falhar.
  const selecionados = orders.filter((o) => sel.includes(o.id));
  const protegidos = selecionados.filter(
    (o) => ["paid", "shipped", "delivered", "refunded"].includes(o.status) || o.melhorenvio_order_id,
  );
  const podeExcluir = selecionados.length > 0 && protegidos.length === 0;

  function rodar(fn: () => Promise<{ error: string } | undefined>) {
    startTransition(async () => {
      setErro(null);
      const res = await fn();
      if (res?.error) {
        setErro(res.error);
        return;
      }
      setSel([]);
      setConfirmandoExclusao(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {sel.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded border border-champagne-600/30 bg-linen-100 p-3">
          <span className="text-sm text-ink">
            <span className="numeral">{sel.length}</span> selecionado{sel.length > 1 ? "s" : ""}
          </span>

          {arquivados ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => rodar(() => arquivarPedidos(sel, false))}
              className="inline-flex items-center gap-1.5 rounded border border-linen-300 bg-linen-50 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-50"
            >
              <ArchiveRestore className="h-4 w-4" /> Desarquivar
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => rodar(() => arquivarPedidos(sel, true))}
              className="inline-flex items-center gap-1.5 rounded border border-linen-300 bg-linen-50 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink disabled:opacity-50"
            >
              <Archive className="h-4 w-4" /> Arquivar
            </button>
          )}

          {confirmandoExclusao ? (
            <span className="flex items-center gap-2">
              <span className="text-sm text-linen-700">
                Excluir <span className="numeral">{sel.length}</span> de vez? Não tem volta.
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => rodar(() => excluirPedidos(sel))}
                className="rounded bg-danger px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-linen-50 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="text-sm text-linen-600 hover:text-champagne-700"
              >
                cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={pending || !podeExcluir}
              onClick={() => setConfirmandoExclusao(true)}
              title={
                podeExcluir
                  ? undefined
                  : "Pedido pago ou com etiqueta não pode ser excluído — use Arquivar."
              }
              className="inline-flex items-center gap-1.5 rounded border border-danger/40 bg-linen-50 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:border-linen-200 disabled:text-linen-300 disabled:hover:bg-linen-50"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          )}

          <button
            type="button"
            onClick={() => setSel([])}
            className="ml-auto text-sm text-linen-600 hover:text-champagne-700"
          >
            limpar seleção
          </button>
        </div>
      ) : (
        orders.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-linen-600">
            <input
              type="checkbox"
              checked={false}
              onChange={() => setSel(ids)}
              className="accent-champagne-600"
            />
            Selecionar os <span className="numeral">{ids.length}</span> desta página
          </label>
        )
      )}

      {erro && <p className="rounded bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

      {protegidos.length > 0 && !arquivados && (
        <p className="rounded bg-warning/10 px-4 py-2 text-xs text-warning">
          <span className="numeral">{protegidos.length}</span> da seleção {protegidos.length === 1 ? "está pago ou tem" : "estão pagos ou têm"}{" "}
          etiqueta: excluir apagaria registro financeiro. Arquivar tira da lista
          e mantém tudo.
        </p>
      )}

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-[0.6875rem] uppercase tracking-[0.12em] text-linen-600">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={() => setSel(todosMarcados ? [] : ids)}
                  aria-label="Selecionar todos"
                  className="accent-champagne-600"
                />
              </th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Data</th>
              <th className="p-3">Pagamento</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Envio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linen-200">
            {orders.map((o) => {
              const marcado = sel.includes(o.id);
              return (
                <tr
                  key={o.id}
                  className={`${marcado ? "bg-linen-100" : "hover:bg-linen-100"}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() =>
                        setSel((s) => (s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id]))
                      }
                      aria-label={`Selecionar pedido ${o.id.slice(0, 8)}`}
                      className="accent-champagne-600"
                    />
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="numeral font-mono text-xs text-champagne-700 hover:underline"
                    >
                      #{o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="text-linen-700 hover:text-champagne-700">
                      {o.customer_name ?? "—"}
                    </Link>
                    <p className="text-xs text-linen-500">{o.customer_email}</p>
                  </td>
                  <td className="numeral p-3 text-linen-600">
                    {dataBR(o.created_at)}
                    <span className="ml-1 text-xs text-linen-500">{horaBR(o.created_at)}</span>
                  </td>
                  <td className="p-3 text-linen-600">
                    {MEIO_LABEL[o.payment_method_kind ?? ""] ?? "—"}
                  </td>
                  <td className="numeral p-3 text-right text-ink">
                    {formatBRL(Number(o.total))}
                    {Number(o.discount) > 0 && (
                      <p className="flex items-center justify-end gap-1 text-xs font-normal text-success">
                        <Ticket className="h-3 w-3" />
                        {o.coupon_code ?? "desconto"}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] ${STATUS_STYLE[o.status] ?? "bg-linen-200 text-linen-600"}`}
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  {/* Diz o que falta para despachar, sem precisar abrir o pedido. */}
                  <td className="p-3 text-xs">
                    {o.melhorenvio_order_id ? (
                      <span className="text-success">etiqueta gerada</span>
                    ) : o.tracking_code ? (
                      <span className="numeral font-mono text-linen-600">{o.tracking_code}</span>
                    ) : !o.shipping_service && !o.shipping_service_id ? (
                      <span className="text-warning">sem transportadora</span>
                    ) : o.shipping_service_id ? (
                      <span className="text-linen-500">pronto p/ etiqueta</span>
                    ) : (
                      // Serviço sem id = definido à mão: não há etiqueta a
                      // comprar, o despacho é por fora.
                      <span className="text-linen-600">
                        {o.shipping_service}
                        <span className="ml-1 text-linen-500">(manual)</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-sm text-linen-600">
                  <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-linen-300" />
                  {arquivados
                    ? "Nenhum pedido arquivado. Use Arquivar na lista de pedidos para tirar da fila o que já foi resolvido."
                    : busca
                      ? "Nenhum pedido com esse filtro. Confira a grafia ou limpe a busca e as abas de status."
                      : "Nenhum pedido ainda. Eles aparecem aqui assim que o primeiro cliente concluir o checkout."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
