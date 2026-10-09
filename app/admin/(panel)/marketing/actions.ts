"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Pixels } from "@/lib/store-defaults";

export async function saveMarketing(formData: FormData) {
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
  if (error) throw new Error(error.message);

  revalidatePath("/admin/marketing");
  revalidatePath("/", "layout");
}
