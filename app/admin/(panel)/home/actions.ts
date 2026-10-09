"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mergeHomeSections, type HomeSection } from "@/lib/store-defaults";

export async function saveHomeSections(sections: HomeSection[]) {
  await requireAdmin();
  const supabase = await createClient();
  // Normaliza/garante que só chaves conhecidas sejam salvas.
  const clean = mergeHomeSections(
    sections.map((s) => ({ key: s.key, title: s.title?.trim() || "", enabled: !!s.enabled })),
  );
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "home_sections", value: clean });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/home");
  revalidatePath("/");
}
