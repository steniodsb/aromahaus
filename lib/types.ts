/** Formato do produto. Dirige ícone, texto de uso e agrupamento na vitrine. */
export type CategoryType =
  | "difusor"
  | "home_spray"
  | "sabonete"
  | "refil"
  | "kit"
  | "acessorio";

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  difusor: "Difusor de varetas",
  home_spray: "Home spray",
  sabonete: "Sabonete líquido",
  refil: "Refil",
  kit: "Kit",
  acessorio: "Acessório",
};

export type ItemType = "product" | "service";

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  type: CategoryType;
  description: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  item_type: ItemType;

  // ── Perfumaria ──────────────────────────────────────────────────────────
  /** Nome da fragrância ("Âmbar Haus"). É o que o cliente procura e filtra. */
  fragrance: string | null;
  /** Floral, Amadeirado, Cítrico, Âmbar, Fresco, Herbal, Gourmand, Verde. */
  olfactory_family: string | null;
  notes_top: string[];
  notes_heart: string[];
  notes_base: string[];
  /** 1 (discreta) a 5 (marcante). */
  intensity: number | null;
  /** Ambientes sugeridos: sala, quarto, banheiro, escritorio, closet, cozinha. */
  rooms: string[];
  /** Volume quando o produto NÃO tem variantes de tamanho. */
  volume_ml: number | null;

  price: number;
  compare_at_price: number | null;
  stock: number;
  cost_price: number | null;
  low_stock_threshold: number;
  weight_g: number | null;
  width_cm: number | null;
  height_cm: number | null;
  length_cm: number | null;
  images: string[];
  featured: boolean;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  author: string | null;
  tags: string[];
  status: "draft" | "published";
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
}

// ── Cupons e regras de frete ────────────────────────────────────────────────

export type DiscountType = "percent" | "fixed" | "free_shipping";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  max_discount: number | null;
  min_subtotal: number;
  first_order_only: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ShippingRuleKind = "free" | "fixed" | "percent_off";

export interface ShippingRule {
  id: string;
  name: string;
  kind: ShippingRuleKind;
  value: number;
  min_subtotal: number;
  max_weight_g: number | null;
  states: string[];
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: "subscribed" | "unsubscribed";
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
}

// ── Variantes de tamanho ────────────────────────────────────────────────────

/**
 * Um tamanho vendável do mesmo produto (250 ml / 500 ml).
 *
 * Produto sem variante continua vendendo pelo preço e estoque dele mesmo —
 * sabonete e refil não têm tamanho para escolher, e forçar uma variante só
 * para padronizar deixaria a página com um seletor de uma opção só.
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  volume_ml: number | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock: number;
  low_stock_threshold: number;
  weight_g: number | null;
  width_cm: number | null;
  height_cm: number | null;
  length_cm: number | null;
  position: number;
  is_active: boolean;
}

/** Produto já com as variantes e a nota média resolvidas, como a vitrine usa. */
export interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  rating_avg: number | null;
  rating_count: number;
}

// ── Avaliações ──────────────────────────────────────────────────────────────

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  order_id: string | null;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  verified_purchase: boolean;
  status: ReviewStatus;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRating {
  product_id: string;
  rating_avg: number;
  rating_count: number;
}
