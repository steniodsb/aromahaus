"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { traduzErro, type FormResult } from "@/lib/admin-form";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function saveCategory(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const id = (formData.get("id") as string) || null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome obrigatório" };

  let slug = (formData.get("slug") as string)?.trim();
  slug = slug ? slugify(slug) : slugify(name);

  // O ImageField já subiu o arquivo e manda só a URL — mesmo caminho de
  // banners, blog e produto.
  const image_url = ((formData.get("image_url") as string) || "").trim() || null;

  const parentId = (formData.get("parent_id") as string) || null;

  if (id) {
    const erro = await validarPai(id, parentId);
    if (erro) return { error: erro };
  }

  const record = {
    name,
    slug,
    type: await tipoHerdado(parentId, (formData.get("type") as string) || null),
    parent_id: parentId,
    description: ((formData.get("description") as string) || "").trim() || null,
    image_url,
    position: Math.round(num(formData.get("position")) ?? 0),
    is_active: formData.get("is_active") === "on",
  };

  if (id) {
    const { error } = await supabase.from("categories").update(record).eq("id", id);
    if (error) return { error: traduzErro(error.message) };
  } else {
    const { error } = await supabase.from("categories").insert(record);
    if (error) return { error: traduzErro(error.message) };
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  redirect("/admin/categorias");
}

export async function toggleCategory(id: string, value: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("categories").update({ is_active: value }).eq("id", id);
  revalidatePath("/admin/categorias");
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
  revalidatePath("/");
}

/**
 * Impede ciclo na árvore de categorias.
 *
 * Roda no SERVIDOR porque o filtro do formulário é só tela: um POST montado à
 * mão apontaria a categoria para uma filha, e o menu da loja entraria em
 * recursão infinita. Sobe a cadeia de pais a partir do novo pai — se topar na
 * própria categoria, é ciclo.
 */
async function validarPai(id: string, parentId: string | null): Promise<string | null> {
  if (!parentId) return null;
  if (parentId === id) return "Uma categoria não pode ser pai dela mesma.";

  const supabase = await createClient();
  const { data: todas } = await supabase.from("categories").select("id, parent_id");

  let cursor: string | null = parentId;
  const visitados = new Set<string>();
  while (cursor) {
    if (cursor === id) return "Essa categoria está abaixo da atual — mover criaria um ciclo.";
    if (visitados.has(cursor)) break; // dado já corrompido; não travar aqui
    visitados.add(cursor);
    cursor = (todas ?? []).find((c) => c.id === cursor)?.parent_id ?? null;
  }
  return null;
}

/**
 * Muda só o pai — usado pelo seletor da listagem, para reorganizar a árvore
 * sem abrir o cadastro de cada categoria.
 */
export async function setCategoryParent(
  id: string,
  parentId: string | null,
): Promise<FormResult> {
  await requireAdmin();

  const erro = await validarPai(id, parentId);
  if (erro) return { error: erro };

  const supabase = await createClient();
  // Mover entre raízes muda o "tipo" junto — eles são a mesma coisa agora.
  const { error } = await supabase
    .from("categories")
    .update({ parent_id: parentId, type: await tipoHerdado(parentId, null) })
    .eq("id", id);
  if (error) return { error: traduzErro(error.message) };

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return undefined;
}

/** Valores do enum `category_type`. Qualquer outro quebra o insert. */
const TIPOS = [
  "difusor",
  "home_spray",
  "sabonete",
  "refil",
  "kit",
  "acessorio",
] as const;

/**
 * O formato do produto: escolhido na categoria de topo, herdado nas filhas.
 *
 * Só a raiz decide — uma subcategoria de "Difusores" é difusor por definição,
 * e deixar os dois editáveis permitiria que discordassem. Na dúvida cai em
 * `acessorio`, que é o valor neutro do enum.
 */
async function tipoHerdado(
  parentId: string | null,
  escolhido: string | null,
): Promise<string> {
  if (!parentId) {
    return (TIPOS as readonly string[]).includes(escolhido ?? "")
      ? escolhido!
      : "acessorio";
  }

  const supabase = await createClient();
  const { data: todas } = await supabase.from("categories").select("id, parent_id, type");

  let cursor: string | null = parentId;
  const visitados = new Set<string>();
  while (cursor) {
    const atual = (todas ?? []).find((c) => c.id === cursor);
    if (!atual) break;
    if (!atual.parent_id) return atual.type as string;
    if (visitados.has(cursor)) break;
    visitados.add(cursor);
    cursor = atual.parent_id;
  }
  return "acessorio";
}

/**
 * Criação rápida a partir da árvore — só o nome.
 *
 * Sem parentId, cria uma categoria de TOPO, que é o que antes se chamava
 * "tipo". Com parentId, cria uma subcategoria dentro dela.
 */
export async function criarCategoriaRapida(
  nome: string,
  parentId: string | null,
): Promise<FormResult> {
  await requireAdmin();

  const limpo = (nome ?? "").trim();
  if (!limpo) return { error: "Informe o nome da categoria." };

  const supabase = await createClient();
  const base = slugify(limpo);
  if (!base) return { error: "Esse nome não gera um endereço válido." };

  const slug = await slugLivre(base, parentId);

  const { error } = await supabase.from("categories").insert({
    name: limpo,
    slug,
    parent_id: parentId,
    type: await tipoHerdado(parentId, null),
    position: 0,
    is_active: true,
  });
  if (error) return { error: traduzErro(error.message) };

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return undefined;
}

/** Renomear direto na árvore, sem abrir o cadastro. O slug não muda junto:
 *  mexer nele quebraria link já indexado. */
export async function renomearCategoria(id: string, nome: string): Promise<FormResult> {
  await requireAdmin();

  const limpo = (nome ?? "").trim();
  if (!limpo) return { error: "O nome não pode ficar vazio." };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name: limpo }).eq("id", id);
  if (error) return { error: traduzErro(error.message) };

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return undefined;
}

/**
 * Acha um endereço livre para a categoria nova.
 *
 * O nome sozinho não serve como endereço: esta loja tem "Volkswagen" em três
 * principais (Retrofit, Coding e Chicotes) e "Audi"/"BMW" em duas. Como o slug
 * é unique, a segunda criação com o mesmo nome batia em `duplicate key` — e o
 * diálogo de criação só pede o NOME, então o admin via o erro sem ter como
 * resolver.
 *
 * A ordem tenta manter a convenção que já existe no banco
 * (`retrofit-volkswagen`): nome puro primeiro, depois prefixado pela principal,
 * e só então numerado.
 */
async function slugLivre(base: string, parentId: string | null): Promise<string> {
  const supabase = await createClient();

  const livre = async (s: string) => {
    const { data } = await supabase.from("categories").select("id").eq("slug", s).maybeSingle();
    return !data;
  };

  if (await livre(base)) return base;

  if (parentId) {
    const { data: pai } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", parentId)
      .maybeSingle();
    if (pai?.slug) {
      const comPai = `${pai.slug}-${base}`;
      if (await livre(comPai)) return comPai;
    }
  }

  // Último recurso. O teto evita laço infinito se algo estiver muito errado.
  for (let i = 2; i < 50; i++) {
    const numerado = `${base}-${i}`;
    if (await livre(numerado)) return numerado;
  }

  // Colisão improvável de timestamp — melhor um endereço feio do que falhar.
  return `${base}-${Date.now().toString(36)}`;
}
