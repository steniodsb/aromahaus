"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeCode } from "@/lib/coupons";
import { traduzErro, type FormResult } from "@/lib/admin-form";
import type { DiscountType } from "@/lib/types";

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function int(v: FormDataEntryValue | null): number | null {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
}

/** `datetime-local` chega sem timezone; string vazia vira null. */
function ts(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function saveCoupon(formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const supabase = await createClient();

  const id = (formData.get("id") as string) || null;

  const code = normalizeCode((formData.get("code") as string) ?? "");
  if (!code) return { error: "Código obrigatório" };
  if (!/^[A-Z0-9._-]{3,32}$/.test(code)) {
    return { error: "Use de 3 a 32 caracteres: letras, números, ponto, hífen ou underline." };
  }

  const type = (formData.get("type") as DiscountType) || "percent";
  const value = num(formData.get("value")) ?? 0;

  if (type === "percent" && (value <= 0 || value > 100)) {
    return { error: "Desconto percentual deve ficar entre 1 e 100." };
  }
  if (type === "fixed" && value <= 0) {
    return { error: "Informe o valor do desconto em reais." };
  }

  const startsAt = ts(formData.get("starts_at"));
  const endsAt = ts(formData.get("ends_at"));
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { error: "A data de fim precisa ser depois da data de início." };
  }

  const record = {
    code,
    description: (formData.get("description") as string) || null,
    type,
    // `free_shipping` não usa valor — zerar evita um número órfão confundindo
    // quem for reabrir o cupom depois.
    value: type === "free_shipping" ? 0 : value,
    max_discount: type === "percent" ? num(formData.get("max_discount")) : null,
    min_subtotal: num(formData.get("min_subtotal")) ?? 0,
    first_order_only: formData.get("first_order_only") === "on",
    starts_at: startsAt,
    ends_at: endsAt,
    max_uses: int(formData.get("max_uses")),
    max_uses_per_customer: int(formData.get("max_uses_per_customer")),
    is_active: formData.get("is_active") === "on",
  };

  if (id) {
    const { error } = await supabase.from("coupons").update(record).eq("id", id);
    if (error) return { error: traduzErro(error.message) };
  } else {
    const { error } = await supabase.from("coupons").insert(record);
    if (error) return { error: traduzErro(error.message) };
  }

  revalidatePath("/admin/cupons");
  redirect("/admin/cupons");
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cupons");
}

export async function toggleCoupon(id: string, value: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").update({ is_active: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cupons");
}
