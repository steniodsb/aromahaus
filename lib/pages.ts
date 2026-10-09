import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAGE_DEFAULTS, FAQ_DEFAULTS, type PageContent } from "@/lib/pages-defaults";

/**
 * Leitura das páginas institucionais e do FAQ.
 *
 * Sempre cai no conteúdo embutido quando o banco não responde — a página é
 * pública e institucional, então servir o texto antigo é sempre melhor do que
 * servir vazio ou 404.
 */

export async function getPage(slug: string): Promise<PageContent | null> {
  const fallback = PAGE_DEFAULTS[slug] ?? null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("pages")
      .select("slug, title, content, seo_title, seo_description, is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return fallback;
    if (!data.is_active) return fallback;

    return {
      slug: data.slug,
      title: data.title,
      seo_title: data.seo_title || data.title,
      seo_description: data.seo_description || fallback?.seo_description || "",
      content: data.content || fallback?.content || "",
    };
  } catch {
    return fallback;
  }
}

export interface FaqItem {
  question: string;
  answer: string;
}

export async function getFaq(): Promise<FaqItem[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("faq_items")
      .select("question, answer")
      .eq("is_active", true)
      .order("position");

    if (error || !data?.length) return FAQ_DEFAULTS;
    return data as FaqItem[];
  } catch {
    return FAQ_DEFAULTS;
  }
}
