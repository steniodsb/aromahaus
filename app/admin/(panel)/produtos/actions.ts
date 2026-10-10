"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { traduzErro, type FormResult } from "@/lib/admin-form";
import { log } from "@/lib/activity";

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

/** "Pimenta rosa, Bergamota" → ["Pimenta rosa", "Bergamota"]. */
function lista(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface VariantDraft {
  id: string | null;
  label: string;
  volume_ml: string;
  sku: string;
  price: string;
  compare_at_price: string;
  stock: string;
  weight_g: string;
  width_cm: string;
  height_cm: string;
  length_cm: string;
  is_active: boolean;
}

/**
 * Põe as variantes do banco no estado que o formulário mandou.
 *
 * O editor manda a lista inteira, não um diff — então aqui é o servidor que
 * compara: o que tem id vira update, o que não tem vira insert, e o que estava
 * no banco e sumiu da lista é apagado.
 *
 * Linha sem rótulo é ignorada em silêncio: é a linha em branco que alguém
 * adicionou e não preencheu, e recusar o formulário inteiro por causa dela
 * seria perder o resto das alterações.
 */
async function sincronizarVariantes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  raw: string,
): Promise<string | null> {
  let drafts: VariantDraft[];
  try {
    drafts = JSON.parse(raw || "[]") as VariantDraft[];
  } catch {
    return "Não foi possível ler os tamanhos.";
  }
  if (!Array.isArray(drafts)) return "Não foi possível ler os tamanhos.";

  const validas = drafts.filter((d) => d.label?.trim());

  const { data: atuais } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  const mantidos = new Set(validas.map((d) => d.id).filter(Boolean) as string[]);
  const apagar = (atuais ?? []).map((v) => v.id).filter((id) => !mantidos.has(id));

  if (apagar.length) {
    // `order_items.variant_id` é ON DELETE SET NULL e guarda `variant_label`,
    // então apagar um tamanho não apaga o histórico de quem comprou nele.
    const { error } = await supabase.from("product_variants").delete().in("id", apagar);
    if (error) return traduzErro(error.message);
  }

  for (const [i, d] of validas.entries()) {
    const n = (v: string) => {
      const parsed = Number(String(v).replace(",", "."));
      return v?.trim() && Number.isFinite(parsed) ? parsed : null;
    };
    const record = {
      product_id: productId,
      label: d.label.trim(),
      volume_ml: n(d.volume_ml),
      sku: d.sku?.trim() || null,
      price: n(d.price) ?? 0,
      compare_at_price: n(d.compare_at_price),
      stock: Math.round(n(d.stock) ?? 0),
      weight_g: n(d.weight_g),
      width_cm: n(d.width_cm),
      height_cm: n(d.height_cm),
      length_cm: n(d.length_cm),
      position: i,
      is_active: d.is_active !== false,
    };

    const { error } = d.id
      ? await supabase.from("product_variants").update(record).eq("id", d.id)
      : await supabase.from("product_variants").insert(record);
    if (error) return traduzErro(error.message);
  }

  return null;
}

export async function saveProduct(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const id = (formData.get("id") as string) || null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome obrigatório" };

  let slug = (formData.get("slug") as string)?.trim();
  if (!slug) slug = slugify(name);
  else slug = slugify(slug);

  // A galeria (client) já subiu os arquivos e manda só as URLs, na ordem —
  // a primeira é a capa que a vitrine usa.
  const images = ((formData.get("images") as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const record = {
    name,
    slug,
    description: (formData.get("description") as string) || null,
    item_type: "product",
    price: num(formData.get("price")) ?? 0,
    compare_at_price: num(formData.get("compare_at_price")),
    stock: Math.round(num(formData.get("stock")) ?? 0),
    sku: (formData.get("sku") as string) || null,
    cost_price: num(formData.get("cost_price")),
    low_stock_threshold: Math.max(0, Math.round(num(formData.get("low_stock_threshold")) ?? 3)),
    weight_g: num(formData.get("weight_g")),
    width_cm: num(formData.get("width_cm")),
    height_cm: num(formData.get("height_cm")),
    length_cm: num(formData.get("length_cm")),
    category_id: (formData.get("category_id") as string) || null,

    // ── Perfumaria ──────────────────────────────────────────────────────
    fragrance: ((formData.get("fragrance") as string) || "").trim() || null,
    olfactory_family:
      ((formData.get("olfactory_family") as string) || "").trim() || null,
    notes_top: lista(formData.get("notes_top")),
    notes_heart: lista(formData.get("notes_heart")),
    notes_base: lista(formData.get("notes_base")),
    intensity: (() => {
      const n = num(formData.get("intensity"));
      return n != null && n >= 1 && n <= 5 ? Math.round(n) : null;
    })(),
    rooms: formData.getAll("rooms").map(String),
    volume_ml: (() => {
      const n = num(formData.get("volume_ml"));
      return n != null ? Math.round(n) : null;
    })(),

    is_active: formData.get("is_active") === "on",
    featured: formData.get("featured") === "on",
    images,
    seo_title: (formData.get("seo_title") as string) || null,
    seo_description: (formData.get("seo_description") as string) || null,
  };

  let productId = id;

  if (id) {
    const { error } = await supabase.from("products").update(record).eq("id", id);
    if (error) return { error: traduzErro(error.message) };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(record)
      .select("id")
      .single();
    if (error) return { error: traduzErro(error.message) };
    productId = data?.id ?? null;
  }

  if (productId) {
    const erroVariantes = await sincronizarVariantes(
      supabase,
      productId,
      (formData.get("variants") as string) ?? "[]",
    );
    if (erroVariantes) return { error: erroVariantes };
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/produto/[slug]", "page");
  redirect("/admin/produtos");
}

export async function deleteProduct(id: string): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: traduzErro(error.message) };
  revalidatePath("/admin/produtos");
  return undefined;
}

export async function toggleProduct(
  id: string,
  field: "is_active" | "featured",
  value: boolean,
): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ [field]: value }).eq("id", id);
  if (error) return { error: traduzErro(error.message) };
  revalidatePath("/admin/produtos");
  return undefined;
}

/**
 * Ações em lote.
 *
 * Reajustar preço do catálogo inteiro ou desativar uma linha de produtos era
 * abrir um cadastro por vez — com 76 produtos, inviável.
 *
 * O reajuste percentual é calculado no SERVIDOR a partir do preço atual de
 * cada produto: mandar o preço novo pronto do browser abriria espaço para o
 * valor chegar adulterado, e o arredondamento precisa ser um só.
 */
export async function acaoEmLote(
  ids: string[],
  acao: "ativar" | "desativar" | "destacar" | "remover_destaque" | "reajustar",
  valor?: number,
): Promise<FormResult> {
  const { user } = await requireAdmin();
  if (!ids.length) return { error: "Selecione ao menos um produto." };

  const supabase = await createClient();

  if (acao === "reajustar") {
    if (valor == null || !Number.isFinite(valor) || valor === 0) {
      return { error: "Informe o percentual (ex.: 10 para +10%, -5 para −5%)." };
    }
    if (valor <= -100) return { error: "Um desconto de 100% ou mais zeraria o preço." };

    const { data: produtos, error: readErr } = await supabase
      .from("products")
      .select("id, price")
      .in("id", ids);
    if (readErr) return { error: traduzErro(readErr.message) };

    for (const p of produtos ?? []) {
      const atual = Number(p.price);
      // Produto "sob consulta" (preço 0) fica de fora: aplicar percentual em
      // zero dá zero, e o item sairia do lote sem ninguém perceber.
      if (!atual) continue;
      const novo = Math.round(atual * (1 + valor / 100) * 100) / 100;
      await supabase.from("products").update({ price: novo }).eq("id", p.id);
    }

    void log({
      actorId: user.id,
      actorEmail: user.email,
      action: "reajustou preço em lote",
      entity: "produto",
      meta: { quantidade: ids.length, percentual: valor },
    });
  } else {
    const campo =
      acao === "ativar" || acao === "desativar"
        ? "is_active"
        : "featured";
    const novo = acao === "ativar" || acao === "destacar";

    const { error } = await supabase
      .from("products")
      .update({ [campo]: novo })
      .in("id", ids);
    if (error) return { error: traduzErro(error.message) };

    void log({
      actorId: user.id,
      actorEmail: user.email,
      action: `${acao} em lote`,
      entity: "produto",
      meta: { quantidade: ids.length },
    });
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/");
  return undefined;
}
