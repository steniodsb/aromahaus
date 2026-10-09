import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aromahaus.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/conta", "/carrinho", "/checkout"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
