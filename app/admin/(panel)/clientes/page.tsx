import Link from "next/link";
import { Users, Search } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { formatBRL, dataBR } from "@/lib/utils";

/**
 * Clientes, montados a partir dos PEDIDOS — não da tabela `profiles`.
 *
 * A loja aceita compra como convidado, então quem comprou sem criar conta não
 * tem perfil nenhum. Listar por `profiles` esconderia justamente a maior parte
 * dos compradores. O e-mail do pedido é o identificador que sempre existe.
 */

interface Cliente {
  email: string;
  nome: string;
  telefone: string | null;
  documento: string | null;
  pedidos: number;
  gasto: number;
  ultimo: string;
  temConta: boolean;
}

export default async function AdminClientesPage(
  props: PageProps<"/admin/clientes">,
) {
  await requireAdmin();
  const sp = await props.searchParams;
  const busca = (typeof sp.q === "string" ? sp.q : "").trim();

  // Service role: precisamos agregar sobre TODOS os pedidos, inclusive os de
  // convidado, que não têm dono e portanto não passariam pela policy de leitura
  // do próprio cliente.
  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("customer_email, customer_name, customer_phone, customer_document, total, status, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (busca) {
    const termo = busca.replace(/[\\%_]/g, (c) => `\\${c}`);
    query = query.or(
      `customer_name.ilike.%${termo}%,customer_email.ilike.%${termo}%,customer_document.ilike.%${termo}%`,
    );
  }

  const { data: pedidos } = await query;

  // Agrupa por e-mail normalizado. "Fulano@X.com" e "fulano@x.com" são a mesma
  // pessoa e precisam somar no mesmo cliente.
  const mapa = new Map<string, Cliente>();
  for (const p of pedidos ?? []) {
    const email = (p.customer_email ?? "").trim().toLowerCase();
    if (!email) continue;

    const atual = mapa.get(email);
    // Só pedido pago/enviado/entregue conta como dinheiro que entrou —
    // somar pedido pendente ou cancelado inflaria o total gasto.
    const faturou = ["paid", "shipped", "delivered"].includes(p.status);

    if (!atual) {
      mapa.set(email, {
        email,
        nome: p.customer_name ?? "—",
        telefone: p.customer_phone,
        documento: p.customer_document,
        pedidos: 1,
        gasto: faturou ? Number(p.total) : 0,
        ultimo: p.created_at,
        temConta: !!p.user_id,
      });
    } else {
      atual.pedidos += 1;
      if (faturou) atual.gasto += Number(p.total);
      atual.temConta = atual.temConta || !!p.user_id;
      atual.documento = atual.documento ?? p.customer_document;
    }
  }

  const clientes = [...mapa.values()].sort((a, b) => b.gasto - a.gasto);
  const recorrentes = clientes.filter((c) => c.pedidos > 1).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink">
          Clientes{" "}
          <span className="text-base font-normal text-linen-500">
            ({clientes.length}
            {recorrentes > 0 && ` · ${recorrentes} recorrente${recorrentes > 1 ? "s" : ""}`})
          </span>
        </h1>

        <form className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-linen-500" />
            <input
              name="q"
              defaultValue={busca}
              placeholder="Nome, e-mail ou CPF"
              className="w-60 rounded-lg border border-linen-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-champagne-600"
            />
          </div>
          <button className="rounded-lg border border-linen-300 px-3 py-2 text-sm font-medium text-linen-700 hover:border-champagne-500 hover:text-champagne-700">
            Buscar
          </button>
          {busca && (
            <Link href="/admin/clientes" className="text-sm text-linen-600 hover:text-champagne-700">
              limpar
            </Link>
          )}
        </form>
      </div>

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-xs uppercase text-linen-600">
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Contato</th>
              <th className="p-3 text-center">Pedidos</th>
              <th className="p-3 text-right">Total gasto</th>
              <th className="p-3">Última compra</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.email} className="border-b border-linen-100 last:border-0 hover:bg-linen-100">
                <td className="p-3">
                  <Link
                    href={`/admin/pedidos?q=${encodeURIComponent(c.email)}`}
                    className="font-medium text-ink hover:text-champagne-700"
                  >
                    {c.nome}
                  </Link>
                  <p className="text-xs text-linen-500">
                    {c.temConta ? "Tem conta na loja" : "Compra como convidado"}
                    {c.documento && ` · CPF ${c.documento}`}
                  </p>
                </td>
                <td className="p-3">
                  <a href={`mailto:${c.email}`} className="text-linen-600 hover:text-champagne-700">
                    {c.email}
                  </a>
                  {c.telefone && (
                    <p className="text-xs text-linen-500">
                      <a
                        href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-champagne-700"
                      >
                        {c.telefone}
                      </a>
                    </p>
                  )}
                </td>
                <td className="p-3 text-center">
                  <span className={c.pedidos > 1 ? "font-semibold text-ink" : "text-linen-600"}>
                    {c.pedidos}
                  </span>
                </td>
                <td className="p-3 text-right font-medium text-ink">{formatBRL(c.gasto)}</td>
                <td className="p-3 text-linen-600">{dataBR(c.ultimo)}</td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-linen-600">
                  <Users className="mx-auto mb-3 h-8 w-8 text-linen-300" />
                  {busca ? "Nenhum cliente com esse termo." : "Ninguém comprou ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-linen-500">
        Montado a partir dos pedidos, agrupando por e-mail. Só pedidos pagos,
        enviados ou entregues contam no total gasto.
      </p>
    </div>
  );
}
