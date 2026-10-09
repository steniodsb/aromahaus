/**
 * Leitor de CSV.
 *
 * Escrito à mão porque o formato que importa aqui é o que o Excel e o Google
 * Sheets exportam, e ele tem três armadilhas que um `split(",")` ignora:
 * campo entre aspas com vírgula dentro, aspas escapadas por duplicação
 * (`""`), e quebra de linha DENTRO de um campo entre aspas — comum em
 * descrição de produto.
 */

/** Divide o texto em linhas de células, respeitando aspas. */
export function parseCSV(texto: string): string[][] {
  // BOM do Excel viraria parte do primeiro cabeçalho e nenhuma coluna casaria.
  const t = texto.replace(/^﻿/, "");

  const linhas: string[][] = [];
  let celula = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celula += '"'; // aspas escapada
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        celula += c;
      }
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === "," || c === ";") {
      // Aceita `;` porque o Excel em português exporta com ponto e vírgula.
      linha.push(celula);
      celula = "";
    } else if (c === "\n") {
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else if (c === "\r") {
      // ignora — o \n seguinte fecha a linha
    } else {
      celula += c;
    }
  }

  if (celula !== "" || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

/** Linhas viram objetos com as chaves do cabeçalho, já normalizadas. */
export function parseCSVObjects(texto: string): Record<string, string>[] {
  const linhas = parseCSV(texto);
  if (linhas.length < 2) return [];

  const cabecalho = linhas[0].map((h) =>
    h
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // "preço" e "preco" têm que casar
      .replace(/\s+/g, "_"),
  );

  return linhas.slice(1).map((l) => {
    const obj: Record<string, string> = {};
    cabecalho.forEach((h, i) => {
      obj[h] = (l[i] ?? "").trim();
    });
    return obj;
  });
}

/**
 * Número em formato brasileiro OU americano.
 *
 * A planilha pode vir com "1.234,56" (Excel pt-BR) ou "1234.56" (export
 * nosso). Confundir os dois transforma R$ 1.234 em R$ 1,23.
 */
export function parseNumero(v: string): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;

  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");

  let limpo = s.replace(/[^\d.,-]/g, "");

  if (temVirgula && temPonto) {
    // O último separador que aparece é o decimal.
    limpo =
      s.lastIndexOf(",") > s.lastIndexOf(".")
        ? limpo.replace(/\./g, "").replace(",", ".")
        : limpo.replace(/,/g, "");
  } else if (temVirgula) {
    limpo = limpo.replace(",", ".");
  }

  // Sem nenhum dígito, `Number("")` devolveria 0 — e um "dez reais" digitado
  // na planilha zeraria o preço do produto em silêncio, jogando ele para
  // "sob consulta". Célula que não é número tem que ser recusada, não virar 0.
  if (!/\d/.test(limpo)) return null;

  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** "sim/não", "true/false", "1/0" — as três formas que aparecem na prática. */
export function parseBool(v: string): boolean | null {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["sim", "s", "true", "1", "yes", "y", "ativo"].includes(s)) return true;
  if (["nao", "não", "n", "false", "0", "no", "inativo"].includes(s)) return false;
  return null;
}
