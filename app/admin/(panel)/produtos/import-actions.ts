"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseCSVObjects, parseNumero, parseBool } from "@/lib/csv";
import { log } from "@/lib/activity";

export interface LinhaImport {
  linha: number;
  sku: string;
  nome: string;
  /** O que muda: campo → [antes, depois]. Vazio = nada muda. */
  mudancas: Record<string, [string, string]>;
  erro?: string;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  simulacao: boolean;
  linhas: LinhaImport[];
  atualizados: number;
  semMudanca: number;
  naoEncontrados: number;
  comErro: number;
}

/**
 * Campos que o CSV pode alterar.
 *
 * Lista fechada de propósito: sem ela, uma coluna extra na planilha (ou um
 * cabeçalho renomeado sem querer) escreveria direto no banco. `slug` e `id`
 * ficam de fora — mudar slug quebra link indexado, e isso tem que ser uma
 * decisão consciente, não efeito colateral de importação.
 */
const CAMPOS: Record<string, { coluna: string; tipo: "numero" | "inteiro" | "bool" | "texto" }> = {
  price: { coluna: "preco", tipo: "numero" },
  compare_at_price: { coluna: "preco_comparativo", tipo: "numero" },
  cost_price: { coluna: "custo", tipo: "numero" },
  stock: { coluna: "estoque", tipo: "inteiro" },
  low_stock_threshold: { coluna: "avisar_abaixo_de", tipo: "inteiro" },
  weight_g: { coluna: "peso_g", tipo: "inteiro" },
  width_cm: { coluna: "largura_cm", tipo: "numero" },
  height_cm: { coluna: "altura_cm", tipo: "numero" },
  length_cm: { coluna: "comprimento_cm", tipo: "numero" },
  is_active: { coluna: "ativo", tipo: "bool" },
  featured: { coluna: "destaque", tipo: "bool" },
  name: { coluna: "nome", tipo: "texto" },
  description: { coluna: "descricao", tipo: "texto" },
};

/**
 * Importa preços/estoque de uma planilha, casando por SKU.
 *
 * Só ATUALIZA — nunca cria produto. Criar a partir de CSV enche o catálogo de
 * item malformado quando a planilha vem errada, e o estrago é silencioso.
 *
 * `simulacao` vem ligada por padrão: o admin vê exatamente o que vai mudar
 * antes de qualquer escrita.
 */
export async function importarProdutos(formData: FormData): Promise<ImportResult> {
  const { user } = await requireAdmin();

  const vazio: ImportResult = {
    ok: false, simulacao: true, linhas: [],
    atualizados: 0, semMudanca: 0, naoEncontrados: 0, comErro: 0,
  };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ...vazio, error: "Selecione um arquivo CSV." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ...vazio, error: "Arquivo muito grande (máximo 2 MB)." };
  }

  const simulacao = formData.get("aplicar") !== "on";
  const texto = await file.text();
  const registros = parseCSVObjects(texto);

  if (!registros.length) {
    return { ...vazio, error: "A planilha está vazia ou sem cabeçalho." };
  }
  if (!("sku" in registros[0])) {
    return {
      ...vazio,
      error: 'A planilha precisa de uma coluna "sku" — é por ela que cada linha acha o produto.',
    };
  }

  const supabase = await createClient();
  const skus = registros.map((r) => r.sku).filter(Boolean);

  const { data: produtos } = await supabase
    .from("products")
    .select("id, sku, name, price, compare_at_price, cost_price, stock, low_stock_threshold, weight_g, width_cm, height_cm, length_cm, is_active, featured, description")
    .in("sku", skus.length ? skus : ["__nenhum__"]);

  const porSku = new Map((produtos ?? []).map((p) => [String(p.sku), p]));

  const linhas: LinhaImport[] = [];
  let atualizados = 0, semMudanca = 0, naoEncontrados = 0, comErro = 0;

  for (const [idx, reg] of registros.entries()) {
    const numeroLinha = idx + 2; // +1 do cabeçalho, +1 porque planilha conta de 1
    const sku = reg.sku?.trim();

    if (!sku) {
      linhas.push({ linha: numeroLinha, sku: "", nome: "", mudancas: {}, erro: "Linha sem SKU." });
      comErro++;
      continue;
    }

    const produto = porSku.get(sku);
    if (!produto) {
      linhas.push({ linha: numeroLinha, sku, nome: reg.nome ?? "", mudancas: {}, erro: "SKU não encontrado no catálogo." });
      naoEncontrados++;
      continue;
    }

    const mudancas: Record<string, [string, string]> = {};
    const patch: Record<string, unknown> = {};
    let erro: string | undefined;

    for (const [campo, def] of Object.entries(CAMPOS)) {
      if (!(def.coluna in reg)) continue;
      const bruto = reg[def.coluna];
      if (bruto === "") continue; // célula vazia = não mexer neste campo

      let valor: unknown;
      if (def.tipo === "bool") {
        valor = parseBool(bruto);
        if (valor === null) { erro = `Coluna "${def.coluna}": use sim ou não.`; break; }
      } else if (def.tipo === "texto") {
        valor = bruto;
      } else {
        const n = parseNumero(bruto);
        if (n === null) { erro = `Coluna "${def.coluna}": "${bruto}" não é número.`; break; }
        if (n < 0) { erro = `Coluna "${def.coluna}": não pode ser negativo.`; break; }
        valor = def.tipo === "inteiro" ? Math.round(n) : n;
      }

      const atual = (produto as Record<string, unknown>)[campo];
      const antes = atual == null ? "" : String(atual);
      const depois = String(valor);
      if (antes !== depois) {
        mudancas[def.coluna] = [antes || "—", depois];
        patch[campo] = valor;
      }
    }

    if (erro) {
      linhas.push({ linha: numeroLinha, sku, nome: produto.name, mudancas: {}, erro });
      comErro++;
      continue;
    }

    if (!Object.keys(patch).length) {
      semMudanca++;
      continue; // não polui a lista com linhas que não mudam nada
    }

    linhas.push({ linha: numeroLinha, sku, nome: produto.name, mudancas });
    atualizados++;

    if (!simulacao) {
      await supabase.from("products").update(patch).eq("id", produto.id);
    }
  }

  if (!simulacao && atualizados > 0) {
    void log({
      actorId: user.id,
      actorEmail: user.email,
      action: "importou planilha",
      entity: "produto",
      meta: { atualizados, ignorados: naoEncontrados, erros: comErro },
    });
    revalidatePath("/admin/produtos");
    revalidatePath("/");
  }

  return { ok: true, simulacao, linhas, atualizados, semMudanca, naoEncontrados, comErro };
}
