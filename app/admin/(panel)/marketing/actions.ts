"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { traduzErro } from "@/lib/admin-form";
import type { Pixels } from "@/lib/store-defaults";

export interface MarketingState {
  ok: boolean;
  error?: string;
  /** Muda a cada gravação — faz o "salvo" reaparecer em saves seguidos. */
  at: number;
}

/** Assinatura de `useActionState`: recebe o estado anterior e devolve o novo. */
export async function saveMarketing(
  _anterior: MarketingState | null,
  formData: FormData,
): Promise<MarketingState> {
  await requireAdmin();
  const supabase = await createClient();

  const pixels: Pixels = {
    ga4_id: ((formData.get("ga4_id") as string) || "").trim(),
    gtm_id: ((formData.get("gtm_id") as string) || "").trim(),
    google_ads_id: ((formData.get("google_ads_id") as string) || "").trim(),
    meta_pixel_id: ((formData.get("meta_pixel_id") as string) || "").trim(),
    head_html: ((formData.get("head_html") as string) || "").trim(),
  };

  const { error } = await supabase
    .from("settings")
    .upsert({ key: "pixels", value: pixels });
  if (error) return { ok: false, error: traduzErro(error.message), at: Date.now() };

  revalidatePath("/admin/marketing");
  revalidatePath("/", "layout");
  return { ok: true, at: Date.now() };
}
