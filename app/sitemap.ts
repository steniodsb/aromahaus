import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://aromahaus.steniowebdesigner.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Tudo que tem endereço fixo e conteúdo próprio. As coleções entram porque
  // são páginas de campanha, com título e texto próprios — não um filtro.
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/produtos",
    "/mais-vendidos",
    "/promocoes",
    "/novidades",
    "/presentes",
    "/blog",
    "/sobre",
    "/contato",
    "/faq",
    "/trocas-e-devolucoes",
    "/termos-de-uso",
    "/politica-de-privacidade",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));

  try {
    const supabase = await createClient();
    const [{ data: categories }, { data: products }, { data: posts }] =
      await Promise.all([
        supabase.from("categories").select("slug").eq("is_active", true),
        supabase.from("products").select("slug").eq("is_active", true),
        supabase.from("blog_posts").select("slug").eq("status", "published"),
      ]);

    const dynamicRoutes: MetadataRoute.Sitemap = [
      ...(categories ?? []).map((c) => ({
        url: `${siteUrl}/categoria/${c.slug}`,
        lastModified: new Date(),
      })),
      ...(products ?? []).map((p) => ({
        url: `${siteUrl}/produto/${p.slug}`,
        lastModified: new Date(),
      })),
      ...(posts ?? []).map((p) => ({
        url: `${siteUrl}/blog/${p.slug}`,
        lastModified: new Date(),
      })),
    ];

    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
