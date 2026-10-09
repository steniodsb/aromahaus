"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MiniBanner, PromoBanner } from "@/lib/store-defaults";

export interface BannerSlide {
  /** Imagem de fundo do slide, atrás do texto (largura toda). */
  bg: string;
  /** Imagem do produto, no card à direita. */
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

export async function saveBanners(slides: BannerSlide[]) {
  await requireAdmin();
  const supabase = await createClient();
  // ⚠️ Este map RECONSTRÓI o slide campo a campo, então qualquer chave que não
  // esteja listada aqui é APAGADA ao salvar. Foi assim que o `bg` sumiu dos
  // três banners: ele existia no banco, mas nunca esteve nesta lista, e o
  // primeiro save pelo painel levou o fundo embora. Ao adicionar campo novo ao
  // slide, adicione TAMBÉM aqui.
  const clean = slides
    .filter((s) => s.title?.trim())
    .map((s) => ({
      bg: s.bg?.trim() || "",
      image: s.image?.trim() || "",
      eyebrow: s.eyebrow?.trim() || "",
      title: s.title.trim(),
      subtitle: s.subtitle?.trim() || "",
      ctaLabel: s.ctaLabel?.trim() || "Ver mais",
      ctaHref: s.ctaHref?.trim() || "/produtos",
    }));
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "banners", value: clean });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function saveMiniBanners(items: MiniBanner[]) {
  await requireAdmin();
  const supabase = await createClient();
  const clean = items
    .filter((b) => b.label?.trim() && b.href?.trim())
    .map((b) => ({
      label: b.label.trim(),
      href: b.href.trim(),
      image: b.image?.trim() || "",
    }));
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "mini_banners", value: clean });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function savePromoBanner(promo: PromoBanner) {
  await requireAdmin();
  const supabase = await createClient();
  const clean: PromoBanner = {
    enabled: !!promo.enabled,
    image: promo.image?.trim() || "",
    eyebrow: promo.eyebrow?.trim() || "",
    title: promo.title?.trim() || "",
    ctaLabel: promo.ctaLabel?.trim() || "Ver mais",
    ctaHref: promo.ctaHref?.trim() || "/produtos",
  };
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "promo_banner", value: clean });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}
