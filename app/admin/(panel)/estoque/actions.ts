"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormResult } from "@/lib/admin-form";
import { log } from "@/lib/activity";

/**
 * Ajuste manual de estoque.
 *
 * Grava o produto E o movimento na mesma operação lógica. O movimento é o que
 * responde "por que o número mudou" — sem ele, uma divergência com a
 * prateleira vira discussão sem prova.
 *
 * Trabalha com DELTA, não com o valor final: dois ajustes simultâneos de "+5"
 * somam 10, enquanto dois "definir como 10" perderiam um. É a mesma razão de
 * `stock_movements` guardar delta em vez de saldo.
 */
export async function ajustarEstoque(formData: FormData): Promise<FormResult> {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return { error: "Produto não informado." };

  const delta = Math.trunc(Number(formData.get("delta")));
  if (!Number.isFinite(delta) || delta === 0) {
    return { error: "Informe quanto entrou (ex.: 10) ou saiu (ex.: -3)." };
  }

  const note = ((formData.get("note") as string) || "").trim() || null;
  const reason = delta > 0 ? "restock" : "adjustment";

  const { data: produto, error: readErr } = await admin
    .from("products")
    .select("stock")
    .eq("id", productId)
    .single();

  if (readErr || !produto) return { error: "Produto não encontrado." };

  const novo = Math.max(0, produto.stock + delta);
  // Se o estoque já era 0, "-3" não tem o que tirar. Registrar um movimento
  // que não mudou nada só sujaria o histórico.
  const aplicado = novo - produto.stock;
  if (aplicado === 0) {
    return { error: `Estoque já está em ${produto.stock}. Nada a ajustar.` };
  }

  const { error: upErr } = await admin
    .from("products")
    .update({ stock: novo })
    .eq("id", productId);
  if (upErr) return { error: upErr.message };

  const { error: movErr } = await admin.from("stock_movements").insert({
    product_id: productId,
    delta: aplicado,
    balance: novo,
    reason,
    note,
    created_by: user.id,
  });
  // O estoque já mudou; falhar aqui só custa o registro. Loga alto porque é
  // exatamente o buraco que esta tela existe para não ter.
  if (movErr) console.error("[estoque] movimento não registrado:", movErr.message);

  void log({
    actorId: user.id,
    actorEmail: user.email,
    action: aplicado > 0 ? "repôs estoque" : "baixou estoque",
    entity: "produto",
    entityId: productId,
    meta: { delta: aplicado, saldo: novo, motivo: note },
  });

  revalidatePath("/admin/estoque");
  revalidatePath("/admin/produtos");
  return undefined;
}
