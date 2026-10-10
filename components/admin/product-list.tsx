"use client";

import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { ProductBulk } from "@/components/admin/product-bulk";

/**
 * Tabela de produtos com seleção.
 *
 * É client component só porque a seleção precisa de estado. A busca e a
 * paginação continuam no servidor, na URL — assim um link para "página 3 de
 * 'vela'" continua funcionando.
 */
export function ProductList({ products, busca }: { products: Product[]; busca: string }) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const ids = products.map((p) => p.id);

  function alternar(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="space-y-3">
      {products.length > 0 && (
        <ProductBulk ids={ids} selecionados={selecionados} onChange={setSelecionados} />
      )}

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-[0.6875rem] uppercase tracking-[0.12em] text-linen-600">
            <tr>
              <th className="w-10 p-3">
                <span className="sr-only">Selecionar</span>
              </th>
              <th className="p-3">Produto</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Estoque</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linen-200">
            {products.map((p) => {
              const marcado = selecionados.includes(p.id);
              return (
                <tr
                  key={p.id}
                  className={`${marcado ? "bg-linen-100" : "hover:bg-linen-100"}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternar(p.id)}
                      aria-label={`Selecionar ${p.name}`}
                      className="accent-champagne-600"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-linen-100">
                        {p.images?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/produtos/${p.id}`}
                          className="text-ink hover:text-champagne-700"
                        >
                          {p.name}
                        </Link>
                        {p.sku && <p className="numeral font-mono text-xs text-linen-500">{p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="numeral p-3 text-linen-600">
                    {!p.price || p.price <= 0 ? (
                      <span className="text-warning">Sob consulta</span>
                    ) : (
                      formatBRL(p.price)
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        "numeral " +
                        (p.stock <= 0
                          ? "text-danger"
                          : p.low_stock_threshold > 0 && p.stock <= p.low_stock_threshold
                            ? "text-warning"
                            : "text-linen-600")
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        p.is_active
                          ? "rounded bg-success/15 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-success"
                          : "rounded bg-linen-200 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-linen-600"
                      }
                    >
                      {p.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3">
                    <ProductRowActions id={p.id} isActive={p.is_active} featured={p.featured} />
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm text-linen-600">
                  <Package className="mx-auto mb-3 h-8 w-8 text-linen-300" />
                  {busca
                    ? "Nenhum produto com esse termo. Tente o nome, o SKU ou parte do slug."
                    : "Nenhum produto cadastrado. Use Novo produto para começar pela primeira fragrância, ou Importar para subir uma planilha."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
