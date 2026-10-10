import Link from "next/link";
import { Search } from "lucide-react";

/**
 * Busca + paginação das listas do admin.
 *
 * Server component: a busca é um `<form method=GET>` comum, então funciona
 * sem JavaScript e a URL guarda o estado — dá para favoritar "produtos
 * esgotados página 2" e voltar nele depois.
 */

export function ListSearch({
  action,
  q,
  placeholder,
  extra,
}: {
  action: string;
  q: string;
  placeholder: string;
  /** Outros filtros da tela, para a busca não apagá-los. */
  extra?: Record<string, string>;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      {Object.entries(extra ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-linen-500" />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="w-56 rounded border border-linen-300 bg-linen-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-champagne-600"
        />
      </div>
      <button className="rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink">
        Buscar
      </button>
      {q && (
        <Link href={action} className="text-sm text-linen-600 hover:text-champagne-700">
          limpar
        </Link>
      )}
    </form>
  );
}

export function Pagination({
  action,
  page,
  total,
  perPage,
  params,
}: {
  action: string;
  page: number;
  total: number;
  perPage: number;
  /** Filtros atuais, preservados nos links de página. */
  params?: Record<string, string>;
}) {
  const paginas = Math.ceil(total / perPage);
  if (paginas <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
    if (p > 1) sp.set("p", String(p));
    const s = sp.toString();
    return s ? `${action}?${s}` : action;
  };

  const inicio = (page - 1) * perPage + 1;
  const fim = Math.min(page * perPage, total);

  const btn =
    "rounded border border-linen-300 px-3 py-1.5 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink";
  const off = "rounded border border-linen-200 px-3 py-1.5 text-xs text-linen-300";

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="numeral text-xs text-linen-600">
        {inicio}–{fim} de {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={btn}>
            Anterior
          </Link>
        ) : (
          <span className={off}>Anterior</span>
        )}
        <span className="numeral text-sm text-linen-600">
          {page} / {paginas}
        </span>
        {page < paginas ? (
          <Link href={href(page + 1)} className={btn}>
            Próxima
          </Link>
        ) : (
          <span className={off}>Próxima</span>
        )}
      </div>
    </div>
  );
}

/** `%` e `_` são curingas de LIKE — sem escapar, a busca traz o que não deveria. */
export function escapeLike(termo: string) {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}
