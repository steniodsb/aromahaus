import { createClient } from "@/lib/supabase/server";
import type {
  Product,
  ProductVariant,
  ProductWithDetails,
  ProductRating,
  Review,
  Category,
  BlogPost,
} from "@/lib/types";
import type {
  Pixels,
  MiniBanner,
  PromoBanner,
  HomeSection,
} from "@/lib/store-defaults";

/**
 * Server-side data fetchers. Each one fails soft (returns an empty result)
 * so pages still render before the database is migrated/seeded.
 */

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("featured", true)
      .limit(limit);
    if (error) throw error;
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

export async function getTopCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .is("parent_id", null)
      .eq("is_active", true)
      .order("position");
    if (error) throw error;
    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) throw error;
    return data as Category;
  } catch {
    return null;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) throw error;
    return data as Product;
  } catch {
    return null;
  }
}

export async function getProductsByCategory(
  categoryId: string,
  childIds: string[] = [],
): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const ids = [categoryId, ...childIds];
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .in("category_id", ids)
      .order("featured", { ascending: false });
    if (error) throw error;
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

export interface BannerSlideData {
  image: string;
  bg?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

export async function getBanners(): Promise<BannerSlideData[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "banners")
      .single();
    if (error) throw error;
    return (data?.value as BannerSlideData[]) ?? [];
  } catch {
    return [];
  }
}

/** Lê um registro genérico da tabela `settings` (fail-soft → null). */
async function getSettingValue<T>(key: string): Promise<T | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .single();
    if (error) throw error;
    return (data?.value as T) ?? null;
  } catch {
    return null;
  }
}

export const getPixels = () => getSettingValue<Pixels>("pixels");
export const getMiniBanners = () => getSettingValue<MiniBanner[]>("mini_banners");
export const getPromoBanner = () => getSettingValue<PromoBanner>("promo_banner");
export const getHomeSections = () => getSettingValue<HomeSection[]>("home_sections");

/** Produtos realmente em promoção (com preço comparativo maior que o preço). */
export async function getPromotions(limit = 10): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .not("compare_at_price", "is", null)
      .order("featured", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as Product[]) ?? []).filter(
      (p) => p.compare_at_price != null && p.compare_at_price > p.price,
    );
  } catch {
    return [];
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const term = query.trim();
    let q = supabase.from("products").select("*").eq("is_active", true);
    // O termo é interpolado DENTRO da expressão do PostgREST, então vírgula,
    // parêntese e ponto são sintaxe, não texto: "difusor, 250 ml" devolvia
    // zero resultado e "a%" devolvia o catálogo inteiro. Pior, dava para
    // pendurar filtro próprio em colunas de `products` (ex.: `cost_price`).
    const safe = term
      .replace(/[,().*%_"':\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (safe) {
      q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
    const { data, error } = await q
      .order("featured", { ascending: false })
      .order("name");
    if (error) throw error;
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

export async function getNewArrivals(limit = 10): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

export async function getBestSellers(limit = 10): Promise<Product[]> {
  // Sem rastreio de vendas ainda: usa itens com preço (compráveis), priorizando
  // ofertas e maior valor como "mais vendidos" placeholder. Trocar quando houver
  // dados reais de pedidos.
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .gt("price", 0)
      .order("compare_at_price", { ascending: false, nullsFirst: false })
      .order("price", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

/** Categorias para os círculos da home: nome + imagem de um produto da categoria. */
export async function getCategoryCircles(slugs: string[]): Promise<
  { name: string; slug: string; image: string | null }[]
> {
  try {
    const supabase = await createClient();
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, slug, image_url")
      .in("slug", slugs)
      .eq("is_active", true);
    if (!cats?.length) return [];
    const ids = cats.map((c) => c.id);
    const { data: prods } = await supabase
      .from("products")
      .select("category_id, images")
      .in("category_id", ids)
      .eq("is_active", true);
    const firstImage = new Map<string, string>();
    for (const p of prods ?? []) {
      const img = (p.images as string[] | null)?.[0];
      if (img && p.category_id && !firstImage.has(p.category_id)) {
        firstImage.set(p.category_id, img);
      }
    }
    // preserva a ordem pedida em `slugs`
    return slugs
      .map((slug) => cats.find((c) => c.slug === slug))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        image: firstImage.get(c.id) ?? c.image_url ?? null,
      }));
  } catch {
    return [];
  }
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("name");
    if (error) throw error;
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

export async function getChildCategories(parentId: string): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("parent_id", parentId)
      .eq("is_active", true)
      .order("position");
    if (error) throw error;
    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

/** Todas as categorias (ativas), usadas para montar facetas de filtro em
 *  telas que misturam categorias (ex.: /produtos e busca). */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("position");
    if (error) throw error;
    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    if (error) throw error;
    return data as BlogPost;
  } catch {
    return null;
  }
}

export async function getPublishedPosts(limit = 12): Promise<BlogPost[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as BlogPost[]) ?? [];
  } catch {
    return [];
  }
}

// ============================================================================
// Perfumaria — variantes, notas e recomendações
// ============================================================================

/**
 * Anexa variantes e nota média a uma lista de produtos.
 *
 * Duas consultas para N produtos, não N+1: a vitrine lista dezenas de cards e
 * cada um precisa do "a partir de" e das estrelas. Fail-soft como o resto —
 * sem variante e sem nota, o card ainda renderiza.
 */
export async function withProductDetails(
  products: Product[],
): Promise<ProductWithDetails[]> {
  if (!products.length) return [];
  const ids = products.map((p) => p.id);

  const [variants, ratings] = await Promise.all([
    (async () => {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("product_variants")
          .select("*")
          .in("product_id", ids)
          .eq("is_active", true)
          .order("position");
        return (data as ProductVariant[]) ?? [];
      } catch {
        return [] as ProductVariant[];
      }
    })(),
    (async () => {
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("product_ratings")
          .select("*")
          .in("product_id", ids);
        return (data as ProductRating[]) ?? [];
      } catch {
        return [] as ProductRating[];
      }
    })(),
  ]);

  const byProduct = new Map<string, ProductVariant[]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id);
    if (list) list.push(v);
    else byProduct.set(v.product_id, [v]);
  }
  const rating = new Map(ratings.map((r) => [r.product_id, r]));

  return products.map((p) => ({
    ...p,
    variants: byProduct.get(p.id) ?? [],
    rating_avg: rating.get(p.id)?.rating_avg ?? null,
    rating_count: rating.get(p.id)?.rating_count ?? 0,
  }));
}

export async function getProductDetails(
  slug: string,
): Promise<ProductWithDetails | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  const [withDetails] = await withProductDetails([product]);
  return withDetails ?? null;
}

/** Avaliações aprovadas de um produto, da mais recente para a mais antiga. */
export async function getProductReviews(productId: string): Promise<Review[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Review[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * O que mostrar embaixo da página de produto.
 *
 * Primeiro a MESMA fragrância em outros formatos — quem gostou do difusor
 * Âmbar Haus quer o home spray Âmbar Haus, não um difusor qualquer. Só depois
 * completa com vizinhos da mesma família olfativa.
 */
export async function getRelatedProducts(
  product: Product,
  limit = 8,
): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const out: Product[] = [];
    const seen = new Set<string>([product.id]);

    const push = (rows: Product[] | null) => {
      for (const r of rows ?? []) {
        if (seen.has(r.id) || out.length >= limit) continue;
        seen.add(r.id);
        out.push(r);
      }
    };

    if (product.fragrance) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("fragrance", product.fragrance)
        .neq("id", product.id)
        .limit(limit);
      push(data as Product[]);
    }

    if (out.length < limit && product.olfactory_family) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("olfactory_family", product.olfactory_family)
        .neq("id", product.id)
        .limit(limit);
      push(data as Product[]);
    }

    if (out.length < limit && product.category_id) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .limit(limit);
      push(data as Product[]);
    }

    return out;
  } catch {
    return [];
  }
}

/** Os produtos favoritados pelo cliente logado. */
export async function getWishlist(): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rows } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const ids = (rows ?? []).map((r) => r.product_id as string);
    if (!ids.length) return [];

    const { data } = await supabase
      .from("products")
      .select("*")
      .in("id", ids)
      .eq("is_active", true);
    // Preserva a ordem de quem foi favoritado por último.
    const byId = new Map((data as Product[] ?? []).map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  } catch {
    return [];
  }
}

/** Ids favoritados pelo cliente logado — para pintar o coração nos cards. */
export async function getWishlistIds(): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Set();
    const { data } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", user.id);
    return new Set((data ?? []).map((r) => r.product_id as string));
  } catch {
    return new Set();
  }
}

/**
 * As fragrâncias do catálogo, com a família olfativa de cada uma.
 *
 * Alimenta o menu "Fragrâncias" e os filtros. Sai daqui, e não de uma lista
 * fixa no código, para que cadastrar uma fragrância nova no painel já a faça
 * aparecer no menu.
 */
export async function getFragrances(): Promise<
  { name: string; family: string | null; count: number }[]
> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("fragrance, olfactory_family")
      .eq("is_active", true)
      .not("fragrance", "is", null);

    const map = new Map<string, { name: string; family: string | null; count: number }>();
    for (const row of data ?? []) {
      const name = (row.fragrance as string | null)?.trim();
      if (!name) continue;
      const found = map.get(name);
      if (found) found.count += 1;
      else
        map.set(name, {
          name,
          family: (row.olfactory_family as string | null) ?? null,
          count: 1,
        });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } catch {
    return [];
  }
}

/** Últimas avaliações aprovadas, com o nome do produto — para a home. */
export async function getLatestReviews(limit = 6): Promise<
  (Review & { product_name: string; product_slug: string })[]
> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reviews")
      .select("*, products(name, slug)")
      .eq("status", "approved")
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(limit);

    return ((data ?? []) as (Review & {
      products: { name: string; slug: string } | null;
    })[])
      .filter((r) => r.products)
      .map((r) => ({
        ...r,
        product_name: r.products!.name,
        product_slug: r.products!.slug,
      }));
  } catch {
    return [];
  }
}
