"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ShippingRuleKind } from "@/lib/types";
import { UFS } from "@/lib/ufs";
import { traduzErro, type FormResult } from "@/lib/admin-form";

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function int(v: FormDataEntryValue | null): number | null {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
}

function ts(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function saveShippingRule(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const id = (formData.get("id") as string) || null;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome obrigatório" };

  const kind = (formData.get("kind") as ShippingRuleKind) || "free";
  const value = num(formData.get("value")) ?? 0;

  if (kind === "percent_off" && (value <= 0 || value > 100)) {
    return { error: "O desconto no frete deve ficar entre 1 e 100%." };
  }
  if (kind === "fixed" && value < 0) {
    return { error: "O valor do frete fixo não pode ser negativo." };
  }

  const startsAt = ts(formData.get("starts_at"));
  const endsAt = ts(formData.get("ends_at"));
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { error: "A data de fim precisa ser depois da data de início." };
  }

  // Checkbox múltiplo: nenhum marcado = Brasil todo.
  const states = formData
    .getAll("states")
    .map((v) => String(v).toUpperCase())
    .filter((uf): uf is (typeof UFS)[number] => (UFS as readonly string[]).includes(uf));

  const record = {
    name,
    kind,
    value: kind === "free" ? 0 : value,
    min_subtotal: num(formData.get("min_subtotal")) ?? 0,
    max_weight_g: int(formData.get("max_weight_g")),
    states,
    starts_at: startsAt,
    ends_at: endsAt,
    priority: int(formData.get("priority")) ?? 0,
    is_active: formData.get("is_active") === "on",
  };

  if (id) {
    const { error } = await supabase.from("shipping_rules").update(record).eq("id", id);
    if (error) return { error: traduzErro(error.message) };
  } else {
    const { error } = await supabase.from("shipping_rules").insert(record);
    if (error) return { error: traduzErro(error.message) };
  }

  revalidatePath("/admin/frete");
  redirect("/admin/frete");
}

export async function deleteShippingRule(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("shipping_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/frete");
}

export async function toggleShippingRule(id: string, value: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_rules")
    .update({ is_active: value })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/frete");
}
