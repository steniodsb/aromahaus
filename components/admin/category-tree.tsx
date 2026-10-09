"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  Settings2,
  FolderTree,
  CornerDownRight,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Category } from "@/lib/types";
import {
  criarCategoriaRapida,
  renomearCategoria,
  setCategoryParent,
  toggleCategory,
  deleteCategory,
} from "@/app/admin/(panel)/categorias/actions";
import {
  CategoryCreateDialog,
  type ModoCriacao,
} from "@/components/admin/category-create-dialog";

/**
 * Organizador de categorias em árvore.
 *
 * Substituiu uma tabela plana que misturava dois eixos: uma coluna "Tipo"
 * (enum de 4 valores fixos no banco) e uma coluna "Pai". Os dois sempre
 * disseram a mesma coisa, então manter os dois na tela só dava chance de
 * discordarem. Aqui existe um eixo só: onde a categoria mora.
 *
 * Os subcomponentes ficam FORA do corpo do componente de propósito: definidos
 * dentro, o React os trata como tipo novo a cada render e remonta o input —
 * o campo de renomear perderia o foco a cada tecla digitada.
 */

type Resultado = { error: string } | undefined;

const BTN_ACAO =
  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-linen-600 transition-colors hover:bg-linen-100 hover:text-champagne-700 disabled:opacity-40";

function NomeCategoria({
  cat,
  raiz,
  renomeando,
  nomeEditado,
  pending,
  onNome,
  onSalvar,
  onCancelar,
}: {
  cat: Category;
  raiz?: boolean;
  renomeando: boolean;
  nomeEditado: string;
  pending: boolean;
  onNome: (v: string) => void;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  if (renomeando) {
    return (
      <span className="flex items-center gap-1">
        <input
          autoFocus
          value={nomeEditado}
          onChange={(e) => onNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSalvar();
            if (e.key === "Escape") onCancelar();
          }}
          className="rounded-lg border border-champagne-600 px-2 py-1 text-sm outline-none"
        />
        <button
          type="button"
          disabled={pending}
          onClick={onSalvar}
          aria-label="Salvar nome"
          className="rounded p-1.5 text-success hover:bg-success/10"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Cancelar"
          className="rounded p-1.5 text-linen-500 hover:bg-linen-100"
        >
          <X className="h-4 w-4" />
        </button>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={raiz ? "font-semibold text-ink" : "text-linen-800"}>{cat.name}</span>
      <span className="truncate font-mono text-xs text-linen-500">/{cat.slug}</span>
      {!cat.is_active && (
        <span className="rounded-full bg-linen-200 px-2 py-0.5 text-xs text-linen-600">
          oculta na loja
        </span>
      )}
    </span>
  );
}

function AcoesCategoria({
  cat,
  pending,
  confirmando,
  onRenomear,
  onAlternar,
  onConfirmar,
  onExcluir,
}: {
  cat: Category;
  pending: boolean;
  confirmando: boolean;
  onRenomear: () => void;
  onAlternar: () => void;
  onConfirmar: (id: string | null) => void;
  onExcluir: () => void;
}) {
  if (confirmando) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-linen-600">Excluir {cat.name}?</span>
        <button
          type="button"
          disabled={pending}
          onClick={onExcluir}
          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          Sim, excluir
        </button>
        <button
          type="button"
          onClick={() => onConfirmar(null)}
          className="text-xs text-linen-500 hover:text-linen-600"
        >
          cancelar
        </button>
      </span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button type="button" onClick={onRenomear} className={BTN_ACAO}>
        <Pencil className="h-3.5 w-3.5" /> Renomear
      </button>

      <Link href={`/admin/categorias/${cat.id}`} className={BTN_ACAO} title="Imagem, SEO e endereço">
        <Settings2 className="h-3.5 w-3.5" /> Editar
      </Link>

      <button type="button" disabled={pending} onClick={onAlternar} className={BTN_ACAO}>
        {cat.is_active ? (
          <>
            <EyeOff className="h-3.5 w-3.5" /> Ocultar
          </>
        ) : (
          <>
            <Eye className="h-3.5 w-3.5" /> Mostrar
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => onConfirmar(cat.id)}
        aria-label={`Excluir ${cat.name}`}
        title="Excluir"
        className="rounded p-1.5 text-linen-300 hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function CategoryTree({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);

  // Diálogo de criação: modo + pai pré-selecionado quando veio de dentro de
  // uma principal.
  const [criando, setCriando] = useState<{ modo: ModoCriacao; pai: string | null } | null>(null);

  const raizes = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const filhasDe = (id: string) =>
    categories
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  // Categoria cujo pai não existe mais. Precisa aparecer, senão fica invisível
  // no painel e viva na loja.
  const orfas = categories.filter(
    (c) => c.parent_id && !categories.some((x) => x.id === c.parent_id),
  );

  function rodar(fn: () => Promise<Resultado>) {
    startTransition(async () => {
      setErro(null);
      const res = await fn();
      if (res?.error) {
        setErro(res.error);
        return;
      }
      setRenomeando(null);
      setConfirmando(null);
      setCriando(null);
      router.refresh();
    });
  }

  const acoesDe = (cat: Category) => ({
    cat,
    pending,
    confirmando: confirmando === cat.id,
    onRenomear: () => {
      setRenomeando(cat.id);
      setNomeEditado(cat.name);
    },
    onAlternar: () =>
      rodar(async () => {
        await toggleCategory(cat.id, !cat.is_active);
        return undefined;
      }),
    onConfirmar: setConfirmando,
    onExcluir: () =>
      rodar(async () => {
        await deleteCategory(cat.id);
        return undefined;
      }),
  });

  const nomeDe = (cat: Category, raiz?: boolean) => ({
    cat,
    raiz,
    pending,
    renomeando: renomeando === cat.id,
    nomeEditado,
    onNome: setNomeEditado,
    onSalvar: () => rodar(() => renomearCategoria(cat.id, nomeEditado)),
    onCancelar: () => setRenomeando(null),
  });

  return (
    <div className="space-y-4">
      {/* Criação em destaque: era um link tracejado no rodapé de cada card, e
          quem chegava na tela não achava por onde começar. */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-linen-200 bg-linen-50 p-4">
        <button
          type="button"
          onClick={() => setCriando({ modo: "principal", pai: null })}
          className="inline-flex items-center gap-2 rounded-lg bg-champagne-600 px-5 py-2.5 font-semibold text-white hover:bg-champagne-700"
        >
          <Plus className="h-4 w-4" /> Criar categoria principal
        </button>
        <button
          type="button"
          disabled={raizes.length === 0}
          onClick={() => setCriando({ modo: "subcategoria", pai: null })}
          title={raizes.length === 0 ? "Crie uma categoria principal primeiro" : undefined}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-champagne-600 px-5 py-2.5 font-semibold text-champagne-700 hover:bg-champagne-600 hover:text-white disabled:cursor-not-allowed disabled:border-linen-300 disabled:text-linen-500 disabled:hover:bg-transparent"
        >
          <CornerDownRight className="h-4 w-4" /> Criar subcategoria
        </button>
        <p className="text-sm text-linen-600">
          Principal aparece no menu. Subcategoria fica dentro de uma principal.
        </p>
      </div>

      {erro && <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

      {raizes.map((raiz) => {
        const filhas = filhasDe(raiz.id);
        return (
          <section key={raiz.id} className="rounded border border-linen-200 bg-linen-50">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linen-200 bg-linen-100 p-4">
              <NomeCategoria {...nomeDe(raiz, true)} />
              <div className="flex items-center gap-2">
                <span className="text-xs text-linen-500">
                  {filhas.length} subcategoria{filhas.length === 1 ? "" : "s"}
                </span>
                <AcoesCategoria {...acoesDe(raiz)} />
              </div>
            </header>

            <div className="divide-y divide-linen-100">
              {filhas.map((filha) => (
                <div
                  key={filha.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-linen-300">↳</span>
                    <NomeCategoria {...nomeDe(filha)} />
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Mover entre principais: o "tipo" muda junto, porque são
                        a mesma coisa. */}
                    <select
                      value={filha.parent_id ?? ""}
                      disabled={pending}
                      onChange={(e) =>
                        rodar(() => setCategoryParent(filha.id, e.target.value || null))
                      }
                      aria-label={`Mover ${filha.name}`}
                      className="rounded-lg border border-linen-300 bg-linen-50 px-2 py-1 text-xs outline-none focus:border-champagne-600 disabled:opacity-50"
                    >
                      <option value="">↑ virar principal</option>
                      {raizes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.id === raiz.id ? `fica em ${r.name}` : `mover para ${r.name}`}
                        </option>
                      ))}
                    </select>
                    <AcoesCategoria {...acoesDe(filha)} />
                  </div>
                </div>
              ))}

              {filhas.length === 0 && (
                <p className="px-4 py-3 text-sm text-linen-500">Nenhuma subcategoria ainda.</p>
              )}

              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCriando({ modo: "subcategoria", pai: raiz.id })}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-champagne-700 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Subcategoria em {raiz.name}
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {orfas.length > 0 && (
        <section className="rounded border border-amber-300 bg-warning/10 p-4">
          <h2 className="mb-1 font-semibold text-amber-900">Sem categoria principal</h2>
          <p className="mb-3 text-sm text-amber-800">
            A categoria principal destas foi excluída. Escolha uma nova para
            elas voltarem a aparecer organizadas.
          </p>
          <div className="space-y-2">
            {orfas.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-linen-50 p-2"
              >
                <NomeCategoria {...nomeDe(o)} />
                <select
                  defaultValue=""
                  disabled={pending}
                  onChange={(e) => rodar(() => setCategoryParent(o.id, e.target.value || null))}
                  aria-label={`Escolher principal de ${o.name}`}
                  className="rounded-lg border border-linen-300 px-2 py-1 text-xs"
                >
                  <option value="">escolher principal…</option>
                  {raizes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {raizes.length === 0 && (
        <div className="rounded border border-dashed border-linen-300 p-10 text-center">
          <FolderTree className="mx-auto mb-3 h-8 w-8 text-linen-300" />
          <p className="text-sm text-linen-600">
            Nenhuma categoria ainda. Comece criando uma principal — ela é a
            seção que aparece no menu da loja.
          </p>
        </div>
      )}

      {criando && (
        <CategoryCreateDialog
          modo={criando.modo}
          principais={raizes}
          paiInicial={criando.pai}
          pending={pending}
          onCriar={(nome, parentId) => rodar(() => criarCategoriaRapida(nome, parentId))}
          onFechar={() => setCriando(null)}
        />
      )}
    </div>
  );
}
