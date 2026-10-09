-- =============================================================
-- Aroma Haus — schema inicial (e-commerce + blog)
-- Postgres / Supabase. Rode no SQL Editor do projeto ou via CLI.
-- =============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------
do $$ begin
  -- Formato do produto. Dirige ícone, texto de uso e agrupamento na vitrine.
  create type category_type as enum ('difusor', 'home_spray', 'sabonete', 'refil', 'kit', 'acessorio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_type as enum ('product', 'service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'paid', 'shipped', 'delivered', 'canceled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------
-- Helper: updated_at trigger
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ----------------------------------------------------------------
-- Profiles (linked to auth.users) + admin flag
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  cpf         text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check helper (used in RLS policies)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ----------------------------------------------------------------
-- Categories (hierarchical)
-- ----------------------------------------------------------------
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid references public.categories(id) on delete set null,
  name          text not null,
  slug          text not null unique,
  type          category_type not null,
  description   text,
  image_url     text,
  position      int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_categories_type on public.categories(type);

create trigger trg_categories_updated
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- Products / Services
-- ----------------------------------------------------------------
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references public.categories(id) on delete set null,
  name             text not null,
  slug             text not null unique,
  description      text,
  sku              text,
  item_type        item_type not null default 'product',

  -- ── Perfumaria ────────────────────────────────────────────────────────
  -- A fragrância é o que o cliente realmente procura ("quero o Maison
  -- Leather"), e ela atravessa vários formatos. Guardada no produto, e não
  -- numa tabela à parte, porque aqui ela é rótulo e facetamento — não uma
  -- entidade com vida própria.
  fragrance        text,
  -- Floral, Amadeirado, Cítrico, Oriental, Fresco, Herbal, Gourmand...
  olfactory_family text,
  notes_top        text[] not null default '{}',
  notes_heart      text[] not null default '{}',
  notes_base       text[] not null default '{}',
  -- 1 (discreta) a 5 (marcante). Dirige o medidor de intensidade na página.
  intensity        smallint check (intensity between 1 and 5),
  -- Ambientes sugeridos: 'sala', 'quarto', 'banheiro', 'escritorio', 'closet'.
  rooms            text[] not null default '{}',
  -- Volume do produto quando ele NÃO tem variantes de tamanho.
  volume_ml        int,
  price            numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  stock            int not null default 0,
  weight_g         int,            -- gramas (frete)
  width_cm         numeric(6,2),
  height_cm        numeric(6,2),
  length_cm        numeric(6,2),
  images           text[] not null default '{}',
  featured         boolean not null default false,
  is_active        boolean not null default true,
  seo_title        text,
  seo_description  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_products_featured on public.products(featured);

create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- Addresses
-- ----------------------------------------------------------------
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  recipient   text,
  cep         text not null,
  street      text not null,
  number      text,
  complement  text,
  district    text,
  city        text not null,
  state       text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_addresses_user on public.addresses(user_id);

-- ----------------------------------------------------------------
-- Orders + items
-- ----------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  status              order_status not null default 'pending',
  customer_name       text,
  customer_email      text,
  customer_phone      text,
  shipping_address    jsonb,
  subtotal            numeric(12,2) not null default 0,
  shipping_cost       numeric(12,2) not null default 0,
  discount            numeric(12,2) not null default 0,
  total               numeric(12,2) not null default 0,
  payment_method      text,
  payment_id          text,             -- Mercado Pago payment id
  payment_status      text,
  shipping_service    text,             -- Melhor Envio service name
  melhorenvio_order_id text,
  tracking_code       text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_payment on public.orders(payment_id);

create trigger trg_orders_updated
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  name_snapshot text not null,
  unit_price    numeric(12,2) not null,
  qty           int not null default 1
);

create index if not exists idx_order_items_order on public.order_items(order_id);

-- ----------------------------------------------------------------
-- Blog
-- ----------------------------------------------------------------
create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  excerpt         text,
  content         text,             -- markdown / MDX
  cover_url       text,
  author          text,
  tags            text[] not null default '{}',
  status          post_status not null default 'draft',
  seo_title       text,
  seo_description text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_blog_status on public.blog_posts(status);
create index if not exists idx_blog_published on public.blog_posts(published_at);

create trigger trg_blog_updated
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- Settings (key/value store config)
-- ----------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create trigger trg_settings_updated
  before update on public.settings
  for each row execute function public.set_updated_at();

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.addresses   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.blog_posts  enable row level security;
alter table public.settings    enable row level security;

-- Profiles: user reads/updates own; admins read all
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Categories: public read active; admin full
create policy "categories_public_read" on public.categories
  for select using (is_active or public.is_admin());
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Products: public read active; admin full
create policy "products_public_read" on public.products
  for select using (is_active or public.is_admin());
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Addresses: owner full; admin read
create policy "addresses_owner_all" on public.addresses
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- Orders: owner reads own; admin full. Inserts handled server-side (service role).
create policy "orders_owner_read" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());
create policy "orders_admin_write" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- Order items: visible if parent order visible
create policy "order_items_read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "order_items_admin_write" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Blog: public reads published; admin full
create policy "blog_public_read" on public.blog_posts
  for select using (status = 'published' or public.is_admin());
create policy "blog_admin_write" on public.blog_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- Settings: public read; admin write
create policy "settings_public_read" on public.settings
  for select using (true);
create policy "settings_admin_write" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());
