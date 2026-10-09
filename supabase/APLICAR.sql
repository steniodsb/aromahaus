-- ============================================================================
-- AROMA HAUS — banco completo, em um arquivo só
--
-- COMO USAR
--   1. Abra o projeto no Supabase → SQL Editor → New query.
--   2. Cole este arquivo inteiro e rode (Run).
--   3. Crie sua conta na loja em /conta/cadastro e depois rode:
--        update public.profiles set is_admin = true where id = '<seu-user-id>';
--      O id está em Authentication → Users.
--
-- É só a concatenação das migrações de supabase/migrations/, na ordem.
-- Idempotente: rodar de novo não duplica nada.
-- Gerado automaticamente — não edite aqui, edite as migrações.
-- ============================================================================


-- ===== 0001_init.sql =================================================
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


-- ===== 0002_seed.sql =================================================
-- =============================================================
-- Aroma Haus — categorias e configurações iniciais
-- Idempotente: usa ON CONFLICT (slug) DO NOTHING.
-- =============================================================

-- ---------- Categorias (o formato do produto) ----------
--
-- A vitrine é organizada por formato, não por fragrância: quem chega já sabe
-- se quer um difusor ou um sabonete, e só depois escolhe o cheiro. A
-- fragrância vira filtro, e vive em `products.fragrance`.
insert into public.categories (name, slug, type, description, position) values
  ('Difusores de Varetas', 'difusores', 'difusor',
   'Perfume contínuo, sem chama e sem tomada. As varetas puxam a essência e devolvem o cheiro no tempo do ambiente.', 1),
  ('Home Sprays', 'home-sprays', 'home_spray',
   'O borrifo que muda a sala em um segundo. Para antes das visitas, depois de cozinhar, ou só porque sim.', 2),
  ('Sabonetes Líquidos', 'sabonetes-liquidos', 'sabonete',
   'Frasco de cerâmica com rosas em relevo, para ficar à vista no lavabo. Fórmula suave, com glicerina.', 3),
  ('Refis', 'refis', 'refil',
   'Recarregue o difusor que já é seu. Mesmo perfume, menos vidro, menos preço.', 4),
  ('Kits & Presentes', 'kits-presentes', 'kit',
   'Combinações prontas para presentear — ou para começar a perfumar a casa de uma vez só.', 5)
on conflict (slug) do nothing;

-- ---------- Configurações ----------
insert into public.settings (key, value) values
  ('store', jsonb_build_object(
     'name', 'Aroma Haus',
     'email', 'contato@aromahaus.com.br',
     'whatsapp', '',
     'instagram', 'aromahaus'
   )),
  ('shipping', jsonb_build_object('free_shipping_threshold', 299, 'from_cep', '')),
  ('banners', '[]'::jsonb)
on conflict (key) do nothing;


-- ===== 0003_ecommerce_automation.sql =================================
-- =============================================================
-- Aroma Haus — automações do e-commerce
-- Idempotency flags, shipment fields, atomic stock decrement,
-- and default store settings. Run after 0001/0002.
-- Idempotent: safe to run more than once.
-- =============================================================

-- ----------------------------------------------------------------
-- Orders: shipment + notification bookkeeping
-- ----------------------------------------------------------------
alter table public.orders
  add column if not exists shipping_service_id  text,          -- Melhor Envio service id (quote id)
  add column if not exists melhorenvio_label_url text,          -- URL do PDF da etiqueta
  add column if not exists stock_decremented    boolean not null default false,
  add column if not exists paid_email_sent      boolean not null default false,
  add column if not exists shipped_email_sent   boolean not null default false,
  add column if not exists last_status_emailed  order_status;   -- último status já comunicado por e-mail

-- ----------------------------------------------------------------
-- Atomic, idempotent stock decrement for a paid order.
-- Only runs once per order (guarded by orders.stock_decremented).
-- Never lets stock go below zero.
-- ----------------------------------------------------------------
create or replace function public.decrement_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.orders where id = p_order_id and stock_decremented) then
    return;
  end if;

  update public.products p
     set stock = greatest(0, p.stock - oi.qty)
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;

  update public.orders set stock_decremented = true where id = p_order_id;
end $$;

-- Restore stock (used on cancel/refund of a previously-paid order).
create or replace function public.restore_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.orders where id = p_order_id and stock_decremented) then
    return;
  end if;

  update public.products p
     set stock = p.stock + oi.qty
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;

  update public.orders set stock_decremented = false where id = p_order_id;
end $$;

-- ----------------------------------------------------------------
-- Default store settings (loja usa esses valores; admin pode editar)
-- ----------------------------------------------------------------
insert into public.settings (key, value) values
  ('store', jsonb_build_object(
      'name',      'Aroma Haus',
      'email',     'contato@aromahaus.com.br',
      'phone',     '',
      'whatsapp',  '',
      'cnpj',      '',
      'document',  ''
  )),
  ('shipping', jsonb_build_object(
      'from_cep',       '',
      'from_name',      'Aroma Haus',
      'from_phone',     '',
      'from_email',     'contato@aromahaus.com.br',
      'from_document',  '',
      'from_address',   '',
      'from_number',    '',
      'from_complement','',
      'from_district',  '',
      'from_city',      '',
      'from_state',     '',
      'free_shipping_threshold', 0
  ))
on conflict (key) do nothing;


-- ===== 0004_checkout_transparente.sql ================================
-- ================================================================
-- 0004 — Checkout transparente (Mercado Pago)
--
-- O cliente passa a pagar SEM sair da loja: Pix (QR code), cartão
-- (tokenizado no browser) e boleto são processados pela API de
-- Payments e o resultado é exibido na própria página do pedido.
-- ================================================================

alter table public.orders
  -- CPF do pagador. Obrigatório no Pix e no boleto (exigência do Mercado
  -- Pago) e também usado como CPF do destinatário na etiqueta do Melhor Envio.
  add column if not exists customer_document text,

  -- "pix" | "card" | "boleto" — como o cliente escolheu pagar.
  add column if not exists payment_method_kind text,

  -- Dados devolvidos pelo gateway para o cliente concluir o pagamento:
  -- Pix    → { qr_code, qr_code_base64, ticket_url, expires_at }
  -- Boleto → { url, barcode }
  -- Guardado como jsonb porque o formato varia por meio de pagamento.
  add column if not exists payment_details jsonb;

comment on column public.orders.customer_document is
  'CPF do pagador (só dígitos). Obrigatório para Pix e boleto.';
comment on column public.orders.payment_method_kind is
  'Meio escolhido no checkout transparente: pix | card | boleto.';
comment on column public.orders.payment_details is
  'Dados para concluir o pagamento (QR code do Pix, URL do boleto).';


-- ===== 0005_cupons_regras_frete.sql ==================================
-- ================================================================
-- 0005 — Cupons de desconto e regras de frete
--
-- Duas coisas que o admin não tinha como mexer sem passar por código:
--   1. cupons (percentual, valor fixo ou frete grátis);
--   2. regras de frete promocionais (frete grátis por região/valor/peso,
--      preço fixo ou desconto no frete).
--
-- Regra que vale para as duas: quem decide é SEMPRE o servidor, em
-- `createCheckout`. A vitrine só espelha o resultado.
-- ================================================================

-- ----------------------------------------------------------------
-- Cupons
-- ----------------------------------------------------------------
do $$ begin
  create type public.discount_type as enum ('percent', 'fixed', 'free_shipping');
exception when duplicate_object then null;
end $$;

create table if not exists public.coupons (
  id                    uuid primary key default gen_random_uuid(),

  -- Guardado sempre em MAIÚSCULAS e sem espaços. O índice unique abaixo é
  -- sobre o valor já normalizado, então "bemvindo10" e "BEMVINDO10" colidem —
  -- que é o que se espera de cupom.
  code                  text not null,
  description           text,

  type                  public.discount_type not null default 'percent',
  -- percent: 0–100 | fixed: R$ | free_shipping: ignorado
  value                 numeric(12,2) not null default 0,
  -- Teto de desconto para cupom percentual (null = sem teto).
  max_discount          numeric(12,2),

  -- Condições
  min_subtotal          numeric(12,2) not null default 0,
  first_order_only      boolean not null default false,
  starts_at             timestamptz,
  ends_at               timestamptz,
  max_uses              int,   -- null = ilimitado
  max_uses_per_customer int,   -- null = ilimitado

  -- Contador desnormalizado, mantido pelo trigger de resgate. Serve para
  -- barrar cupom esgotado sem varrer a tabela de resgates a cada checkout.
  used_count            int not null default 0,

  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint coupons_value_nonneg check (value >= 0),
  constraint coupons_percent_range check (type <> 'percent' or value <= 100),
  constraint coupons_window check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index if not exists idx_coupons_code on public.coupons (upper(btrim(code)));
create index if not exists idx_coupons_active on public.coupons (is_active);

create trigger trg_coupons_updated
  before update on public.coupons
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- Resgates — uma linha por pedido que usou cupom.
--
-- É a fonte da verdade do limite por cliente. Guarda o e-mail além do
-- user_id porque a loja aceita compra como convidado (sem conta).
-- ----------------------------------------------------------------
create table if not exists public.coupon_redemptions (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references public.coupons(id) on delete cascade,
  order_id       uuid not null references public.orders(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  customer_email text,
  amount         numeric(12,2) not null default 0,
  created_at     timestamptz not null default now(),

  -- Um cupom só conta uma vez por pedido, mesmo se o checkout for reenviado.
  unique (coupon_id, order_id)
);

create index if not exists idx_redemptions_coupon on public.coupon_redemptions(coupon_id);
create index if not exists idx_redemptions_email on public.coupon_redemptions(lower(customer_email));

-- Mantém `coupons.used_count` em dia sem o app precisar lembrar disso.
create or replace function public.sync_coupon_used_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.coupons set used_count = used_count + 1 where id = new.coupon_id;
  elsif tg_op = 'DELETE' then
    update public.coupons set used_count = greatest(0, used_count - 1) where id = old.coupon_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_redemptions_count on public.coupon_redemptions;
create trigger trg_redemptions_count
  after insert or delete on public.coupon_redemptions
  for each row execute function public.sync_coupon_used_count();

-- ----------------------------------------------------------------
-- Pedido guarda qual cupom usou.
--
-- `discount` já existia em orders; faltava saber de onde ele veio.
-- `coupon_code` é snapshot: se o cupom for apagado, o pedido antigo continua
-- explicando o próprio desconto.
-- ----------------------------------------------------------------
alter table public.orders
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists coupon_code text;

-- ----------------------------------------------------------------
-- Regras de frete
--
-- Avaliadas depois da cotação do Melhor Envio: a transportadora e o prazo
-- continuam sendo os reais, a regra só mexe no PREÇO cobrado do cliente.
-- ----------------------------------------------------------------
do $$ begin
  create type public.shipping_rule_kind as enum ('free', 'fixed', 'percent_off');
exception when duplicate_object then null;
end $$;

create table if not exists public.shipping_rules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,

  kind          public.shipping_rule_kind not null default 'free',
  -- free: ignorado | fixed: R$ cobrado | percent_off: 0–100 de desconto
  value         numeric(12,2) not null default 0,

  -- Condições. Todas opcionais; as preenchidas precisam bater juntas.
  min_subtotal  numeric(12,2) not null default 0,
  max_weight_g  int,
  -- Vazio = vale para o Brasil todo.
  states        text[] not null default '{}',
  starts_at     timestamptz,
  ends_at       timestamptz,

  -- Maior prioridade ganha. Empate: a mais recente. Só UMA regra se aplica,
  -- para nunca empilhar dois descontos no mesmo frete.
  priority      int not null default 0,

  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint shipping_rules_value_nonneg check (value >= 0),
  constraint shipping_rules_percent_range check (kind <> 'percent_off' or value <= 100),
  constraint shipping_rules_window check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists idx_shipping_rules_active on public.shipping_rules(is_active, priority desc);

-- Qual regra explicou o frete deste pedido. Sem isso, um frete promocional
-- vira um número sem história quando alguém for auditar meses depois.
alter table public.orders
  add column if not exists shipping_rule_id uuid references public.shipping_rules(id) on delete set null;

create trigger trg_shipping_rules_updated
  before update on public.shipping_rules
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- RLS
--
-- Cupom NÃO tem leitura pública: a lista de códigos ativos não pode vazar
-- para quem abrir o devtools. Validação só pelo servidor (service role).
-- ----------------------------------------------------------------
alter table public.coupons            enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.shipping_rules     enable row level security;

create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy "redemptions_admin_all" on public.coupon_redemptions
  for all using (public.is_admin()) with check (public.is_admin());

-- Regras de frete podem ser lidas por qualquer um: o efeito delas já aparece
-- no preço do frete de todo jeito, não há nada a esconder.
create policy "shipping_rules_public_read" on public.shipping_rules
  for select using (is_active or public.is_admin());
create policy "shipping_rules_admin_write" on public.shipping_rules
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.coupons is
  'Cupons de desconto. Validação sempre no servidor — sem leitura pública.';
comment on table public.shipping_rules is
  'Regras promocionais de frete. Só uma se aplica por pedido (maior priority).';


-- ===== 0006_newsletter.sql ===========================================
-- ================================================================
-- 0006 — Newsletter em tabela
--
-- Antes os inscritos viviam num array JSON em `settings.newsletter`: cada
-- inscrição lia o array inteiro, dava push e reescrevia tudo. Dois cadastros
-- ao mesmo tempo perdiam um (o segundo sobrescrevia a leitura do primeiro), e
-- não havia como listar, exportar nem descadastrar ninguém.
-- ================================================================

create table if not exists public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),

  -- Sempre normalizado pelo trigger abaixo, então o unique já resolve
  -- "Fulano@X.com" vs "fulano@x.com" sem precisar de índice funcional
  -- (que o PostgREST não conseguiria usar no ON CONFLICT do upsert).
  email           text not null unique,

  status          text not null default 'subscribed'
                    check (status in ('subscribed', 'unsubscribed')),
  -- De onde veio a inscrição (rodapé da loja, checkout, importação…).
  source          text,

  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists idx_newsletter_status on public.newsletter_subscribers(status);

-- Normaliza o e-mail em qualquer caminho de escrita — inclusive importação
-- manual pelo SQL editor, que é justamente onde ninguém lembra de fazer isso.
create or replace function public.normalize_newsletter_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(btrim(new.email));
  -- Carimba a data ao descadastrar, e limpa se a pessoa voltar.
  if new.status = 'unsubscribed' and new.unsubscribed_at is null then
    new.unsubscribed_at := now();
  elsif new.status = 'subscribed' then
    new.unsubscribed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_newsletter_normalize on public.newsletter_subscribers;
create trigger trg_newsletter_normalize
  before insert or update on public.newsletter_subscribers
  for each row execute function public.normalize_newsletter_email();

-- ----------------------------------------------------------------
-- Traz quem já estava no array antigo, sem perder ninguém.
-- ----------------------------------------------------------------
insert into public.newsletter_subscribers (email, created_at, source)
select
  lower(btrim(item->>'email')),
  coalesce((item->>'at')::timestamptz, now()),
  'settings (migrado)'
from public.settings s
cross join lateral jsonb_array_elements(s.value) as item
where s.key = 'newsletter'
  and jsonb_typeof(s.value) = 'array'
  and coalesce(item->>'email', '') <> ''
on conflict (email) do nothing;

-- O array antigo vira uma lista vazia: se algum código velho ainda ler
-- `settings.newsletter`, ele lê vazio em vez de uma lista desatualizada que
-- alguém poderia confundir com a verdade.
update public.settings set value = '[]'::jsonb where key = 'newsletter';

-- ----------------------------------------------------------------
-- RLS — a lista de e-mails é dado pessoal: ninguém lê sem ser admin.
-- A inscrição pela loja passa pelo service role (server action), que ignora
-- RLS, então não é preciso abrir INSERT para o público.
-- ----------------------------------------------------------------
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_admin_all" on public.newsletter_subscribers;
create policy "newsletter_admin_all" on public.newsletter_subscribers
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.newsletter_subscribers is
  'Inscritos da newsletter. Leitura só para admin — é dado pessoal.';


-- ===== 0007_estoque_paginas_faq.sql ==================================
-- ================================================================
-- 0007 — Histórico de estoque, páginas institucionais e FAQ editáveis
--        (as tabelas vivem aqui; o conteúdo da Aroma Haus entra na 0012)
--
-- Fecha três lacunas do P0 da varredura:
--   EST-01  o estoque era um número solto: caía e subia sem deixar rastro;
--   CMS-01  FAQ, Termos, Trocas e Privacidade viviam no código, então mudar
--           uma linha exigia deploy — e é justamente o texto que mais muda.
-- ================================================================

-- ----------------------------------------------------------------
-- EST-01 — movimentação de estoque
-- ----------------------------------------------------------------
alter table public.products
  -- Abaixo disso o painel avisa. 0 desliga o aviso para aquele produto.
  add column if not exists low_stock_threshold int not null default 3,
  -- Custo de compra. Sem ele o painel só sabe faturamento, nunca lucro.
  add column if not exists cost_price numeric(12,2);

create table if not exists public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,

  -- Negativo = saiu, positivo = entrou. Guardamos o delta, não o total:
  -- é o delta que permite reconstruir o saldo e achar onde ele divergiu.
  delta       int not null,
  -- Saldo depois deste movimento, para auditar sem somar a tabela inteira.
  balance     int,

  reason      text not null
                check (reason in ('order_paid', 'order_canceled', 'manual', 'restock', 'adjustment')),
  order_id    uuid references public.orders(id) on delete set null,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_stock_mov_product on public.stock_movements(product_id, created_at desc);
create index if not exists idx_stock_mov_order on public.stock_movements(order_id);

-- ----------------------------------------------------------------
-- As RPCs de estoque passam a registrar o movimento.
--
-- Continuam idempotentes pela flag `stock_decremented` do pedido — sem isso,
-- dois webhooks do Mercado Pago para o mesmo pagamento baixariam o estoque
-- duas vezes.
-- ----------------------------------------------------------------
create or replace function public.decrement_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.orders where id = p_order_id and stock_decremented) then
    return;
  end if;

  update public.products p
     set stock = greatest(0, p.stock - oi.qty)
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;

  insert into public.stock_movements (product_id, delta, balance, reason, order_id)
  select oi.product_id, -oi.qty, p.stock, 'order_paid', p_order_id
    from public.order_items oi
    join public.products p on p.id = oi.product_id
   where oi.order_id = p_order_id;

  update public.orders set stock_decremented = true where id = p_order_id;
end $$;

create or replace function public.restore_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.orders where id = p_order_id and stock_decremented) then
    return;
  end if;

  update public.products p
     set stock = p.stock + oi.qty
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;

  insert into public.stock_movements (product_id, delta, balance, reason, order_id)
  select oi.product_id, oi.qty, p.stock, 'order_canceled', p_order_id
    from public.order_items oi
    join public.products p on p.id = oi.product_id
   where oi.order_id = p_order_id;

  update public.orders set stock_decremented = false where id = p_order_id;
end $$;

-- ----------------------------------------------------------------
-- CMS-01 — páginas institucionais
-- ----------------------------------------------------------------
create table if not exists public.pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  -- Markdown. A loja renderiza com um subconjunto próprio (títulos,
  -- parágrafos, negrito, itálico, links e listas) — sem HTML cru, então não
  -- há como um texto do painel injetar script na loja.
  content         text not null default '',
  seo_title       text,
  seo_description text,
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_pages_updated on public.pages;
create trigger trg_pages_updated
  before update on public.pages
  for each row execute function public.set_updated_at();

-- Conteúdo atual, transcrito do código. Sem este seed as páginas ficariam em
-- branco no momento do deploy.
-- O conteúdo das páginas é semeado na 0012, junto com o FAQ.

-- ----------------------------------------------------------------
-- FAQ — lista, não prosa, então tem tabela própria.
-- ----------------------------------------------------------------
create table if not exists public.faq_items (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  position   int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faq_position on public.faq_items(position);

drop trigger if exists trg_faq_updated on public.faq_items;
create trigger trg_faq_updated
  before update on public.faq_items
  for each row execute function public.set_updated_at();

-- O FAQ é semeado na 0012.

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
alter table public.stock_movements enable row level security;
alter table public.pages           enable row level security;
alter table public.faq_items       enable row level security;

drop policy if exists "stock_mov_admin" on public.stock_movements;
create policy "stock_mov_admin" on public.stock_movements
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read" on public.pages
  for select using (is_active or public.is_admin());
drop policy if exists "pages_admin_write" on public.pages;
create policy "pages_admin_write" on public.pages
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "faq_public_read" on public.faq_items;
create policy "faq_public_read" on public.faq_items
  for select using (is_active or public.is_admin());
drop policy if exists "faq_admin_write" on public.faq_items;
create policy "faq_admin_write" on public.faq_items
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.stock_movements is
  'Histórico de estoque. Delta por movimento — o saldo se reconstrói somando.';
comment on table public.pages is
  'Páginas institucionais em markdown, editáveis pelo admin.';


-- ===== 0008_log_admins.sql ===========================================
-- ================================================================
-- 0008 — Registro de atividade do painel
--
-- SEG-01 da varredura. Já existem duas contas admin e nada registra quem
-- mudou preço, apagou produto ou estornou pedido. Com mais de uma pessoa no
-- painel isso deixa de ser opcional.
-- ================================================================

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),

  -- Quem. `set null` no delete para o histórico sobreviver à remoção da conta:
  -- apagar o usuário não pode apagar o rastro do que ele fez.
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,

  -- O quê: "criou", "editou", "apagou", "estornou", "ajustou_estoque"…
  action      text not null,
  -- Onde: "produto", "pedido", "cupom", "categoria"…
  entity      text not null,
  entity_id   text,
  -- Rótulo legível do alvo, congelado no momento do registro — se o produto
  -- for apagado depois, a linha continua dizendo de qual se tratava.
  entity_label text,

  -- Detalhe livre (valores antes/depois, motivo).
  meta        jsonb,

  created_at  timestamptz not null default now()
);

create index if not exists idx_activity_created on public.activity_log(created_at desc);
create index if not exists idx_activity_entity on public.activity_log(entity, entity_id);

alter table public.activity_log enable row level security;

drop policy if exists "activity_admin_read" on public.activity_log;
create policy "activity_admin_read" on public.activity_log
  for select using (public.is_admin());

-- Escrita só pelo service role (server actions). Sem policy de insert, nem um
-- admin logado consegue forjar uma linha pelo cliente.

comment on table public.activity_log is
  'Quem fez o quê no painel. Escrito pelas server actions via service role.';


-- ===== 0009_pedidos_arquivar.sql =====================================
-- ================================================================
-- 0009 — Arquivar pedidos
--
-- Pedido de teste sujava a lista para sempre: não havia como tirar da vista
-- sem apagar, e apagar um pedido pago destrói registro financeiro.
--
-- Arquivar é reversível e não perde nada — só some da lista padrão.
-- ================================================================

alter table public.orders
  add column if not exists archived_at timestamptz;

-- A lista padrão filtra por `archived_at is null`; o índice parcial cobre
-- exatamente esse caminho sem carregar as linhas arquivadas.
create index if not exists idx_orders_nao_arquivados
  on public.orders(created_at desc)
  where archived_at is null;

comment on column public.orders.archived_at is
  'Quando foi arquivado. NULL = aparece na lista. Arquivar não apaga nada.';


-- ===== 0010_perfumaria.sql ===========================================
-- ================================================================
-- 0010 — O que uma perfumaria precisa e um e-commerce genérico não tem
--
--   VAR-01  variantes de tamanho (250 ml / 500 ml). A fragrância é a mesma,
--           o preço, o peso e o estoque não são. Sem isto a loja viraria um
--           catálogo de produtos quase idênticos e o cliente teria que
--           adivinhar qual página é a do frasco grande.
--   AVA-01  avaliações com nota. Perfume de ambiente é compra às cegas: o
--           cliente não cheira antes. O relato de quem já comprou é o que
--           substitui o cheiro na decisão.
--   DES-01  lista de desejos.
--   PRE-01  presente: embrulho e cartão com mensagem, por pedido.
--
-- Idempotente: pode rodar mais de uma vez.
-- ================================================================

-- ----------------------------------------------------------------
-- VAR-01 — variantes
--
-- Uma variante é um tamanho vendável do mesmo produto. Produto sem variante
-- continua vendendo por `products.price`/`products.stock` — a loja não exige
-- que todo item tenha tamanho, porque sabonete e refil não têm.
-- ----------------------------------------------------------------
create table if not exists public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,

  -- O que aparece no botão: "250 ml", "500 ml", "Refil 250 ml".
  label            text not null,
  volume_ml        int,
  sku              text,

  price            numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  cost_price       numeric(12,2),
  stock            int not null default 0,
  low_stock_threshold int not null default 3,

  -- Frete por tamanho: o 500 ml não pesa o mesmo que o 250 ml.
  weight_g         int,
  width_cm         numeric(6,2),
  height_cm        numeric(6,2),
  length_cm        numeric(6,2),

  position         int not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_variants_product
  on public.product_variants(product_id, position);
create index if not exists idx_variants_active
  on public.product_variants(is_active);

do $$ begin
  create trigger trg_variants_updated
    before update on public.product_variants
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- O item do pedido passa a saber QUAL tamanho foi vendido.
-- `variant_label` é cópia, não referência: se amanhã a variante for apagada
-- ou renomeada, o pedido antigo continua dizendo o que o cliente comprou.
alter table public.order_items
  add column if not exists variant_id    uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_label text;

alter table public.stock_movements
  add column if not exists variant_id uuid references public.product_variants(id) on delete cascade;

-- ----------------------------------------------------------------
-- Estoque com variantes
--
-- As RPCs voltam a ser reescritas (vieram de 0003 e 0007) porque agora a
-- baixa pode cair em duas tabelas diferentes no mesmo pedido: um carrinho
-- com um difusor 500 ml e um sabonete mexe em `product_variants` e em
-- `products`. Continuam idempotentes pela flag `orders.stock_decremented`.
-- ----------------------------------------------------------------
create or replace function public.decrement_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.orders where id = p_order_id and stock_decremented) then
    return;
  end if;

  -- Itens COM variante baixam da variante.
  update public.product_variants v
     set stock = greatest(0, v.stock - oi.qty)
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.variant_id = v.id;

  -- Itens SEM variante baixam do produto.
  update public.products p
     set stock = greatest(0, p.stock - oi.qty)
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.variant_id is null
     and oi.product_id = p.id;

  insert into public.stock_movements (product_id, variant_id, delta, balance, reason, order_id)
  select oi.product_id,
         oi.variant_id,
         -oi.qty,
         coalesce(v.stock, p.stock),
         'order_paid',
         p_order_id
    from public.order_items oi
    left join public.product_variants v on v.id = oi.variant_id
    left join public.products p on p.id = oi.product_id
   where oi.order_id = p_order_id
     and oi.product_id is not null;

  update public.orders set stock_decremented = true where id = p_order_id;
end $$;

create or replace function public.restore_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.orders where id = p_order_id and stock_decremented) then
    return;
  end if;

  update public.product_variants v
     set stock = v.stock + oi.qty
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.variant_id = v.id;

  update public.products p
     set stock = p.stock + oi.qty
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.variant_id is null
     and oi.product_id = p.id;

  insert into public.stock_movements (product_id, variant_id, delta, balance, reason, order_id)
  select oi.product_id,
         oi.variant_id,
         oi.qty,
         coalesce(v.stock, p.stock),
         'order_canceled',
         p_order_id
    from public.order_items oi
    left join public.product_variants v on v.id = oi.variant_id
    left join public.products p on p.id = oi.product_id
   where oi.order_id = p_order_id
     and oi.product_id is not null;

  update public.orders set stock_decremented = false where id = p_order_id;
end $$;

-- ----------------------------------------------------------------
-- AVA-01 — avaliações
--
-- Só entra na vitrine depois de aprovada. `verified_purchase` é calculado no
-- servidor a partir dos pedidos pagos do cliente: é a diferença entre um
-- comentário e uma prova.
-- ----------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  order_id    uuid references public.orders(id) on delete set null,

  author_name text not null,
  rating      smallint not null check (rating between 1 and 5),
  title       text,
  body        text,
  images      text[] not null default '{}',

  verified_purchase boolean not null default false,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  -- Resposta pública da loja, assinada pela marca.
  reply       text,
  replied_at  timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_reviews_product
  on public.reviews(product_id, status, created_at desc);
create index if not exists idx_reviews_status on public.reviews(status);

-- Uma avaliação por cliente por produto. Quem comprou de novo edita a que já
-- escreveu, em vez de empilhar notas e distorcer a média.
create unique index if not exists idx_reviews_user_product
  on public.reviews(user_id, product_id) where user_id is not null;

do $$ begin
  create trigger trg_reviews_updated
    before update on public.reviews
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Média e contagem já agregadas: a vitrine lista dezenas de produtos e não
-- pode somar a tabela de avaliações uma vez por card.
create or replace view public.product_ratings as
  select product_id,
         round(avg(rating)::numeric, 2) as rating_avg,
         count(*)::int                  as rating_count
    from public.reviews
   where status = 'approved'
   group by product_id;

-- ----------------------------------------------------------------
-- DES-01 — lista de desejos
-- ----------------------------------------------------------------
create table if not exists public.wishlist_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists idx_wishlist_user
  on public.wishlist_items(user_id, created_at desc);

-- ----------------------------------------------------------------
-- PRE-01 — presente
--
-- Perfumaria de casa é comprada para presentear com muita frequência; sem
-- isto o cliente manda a caixa com a nota fiscal e o preço para quem recebe.
-- ----------------------------------------------------------------
alter table public.orders
  add column if not exists is_gift        boolean not null default false,
  add column if not exists gift_message   text,
  add column if not exists gift_wrap_fee  numeric(12,2) not null default 0;

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
alter table public.product_variants enable row level security;
alter table public.reviews          enable row level security;
alter table public.wishlist_items   enable row level security;

do $$ begin
  create policy "variants_public_read" on public.product_variants
    for select using (is_active or public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "variants_admin_write" on public.product_variants
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

-- Avaliação aprovada é pública; a própria, o autor sempre enxerga.
do $$ begin
  create policy "reviews_public_read" on public.reviews
    for select using (status = 'approved' or auth.uid() = user_id or public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reviews_admin_write" on public.reviews
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "wishlist_owner_all" on public.wishlist_items
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- A view herda a RLS da tabela de origem (security_invoker), em vez de
-- devolver tudo com os privilégios de quem a criou.
alter view public.product_ratings set (security_invoker = true);


-- ===== 0011_seed_catalogo.sql ========================================
-- ================================================================
-- 0011 — Catálogo de demonstração da Aroma Haus
--
-- Oito fragrâncias autorais em quatro formatos, mais três kits. É conteúdo
-- de vitrine: serve para a loja nascer navegável e apresentável, e para o
-- painel ter o que mostrar. Tudo é editável em Admin → Produtos; apagar daqui
-- não quebra nada.
--
-- As imagens vivem em /public/produtos e /public/home. Quando chegarem as
-- fotos de estúdio, basta subir pelo painel: o campo aceita URL do Storage.
--
-- Idempotente: ON CONFLICT (slug) DO NOTHING.
-- ================================================================

-- ----------------------------------------------------------------
-- Produtos: fragrância × formato
-- ----------------------------------------------------------------
with f(slug, nome, familia, topo, corpo, fundo, intensidade, ambientes, descricao, pos) as (
  values
    ('linho-branco', 'Linho Branco', 'Fresco',
     array['Bergamota','Pera'], array['Algodão','Lírio-branco'], array['Almíscar branco','Cedro'],
     2, array['quarto','closet','banheiro'],
     'O cheiro de roupa de cama limpa secando no sol. Almíscar branco e algodão sobre um fundo de cedro, discreto o bastante para ficar ligado o dia inteiro sem cansar.', 1),

    ('flor-de-figo', 'Flor de Figo', 'Verde',
     array['Figo verde','Limão-siciliano'], array['Folha de figueira','Jasmim'], array['Leite de coco','Sândalo'],
     3, array['sala','cozinha'],
     'A folha da figueira amassada entre os dedos: verde, leitosa e um pouco amarga. Fecha em coco e sândalo, e deixa a casa com ar de fim de tarde no litoral.', 2),

    ('ambar-haus', 'Âmbar Haus', 'Âmbar',
     array['Pimenta rosa','Bergamota'], array['Âmbar','Incenso'], array['Baunilha bourbon','Patchouli'],
     4, array['sala','escritorio'],
     'A fragrância da casa. Âmbar, incenso e baunilha bourbon abertos por pimenta rosa: quente, envolvente e levemente defumada, feita para a sala no inverno.', 3),

    ('rosa-palida', 'Rosa Pálida', 'Floral',
     array['Lichia','Pêssego'], array['Rosa damascena','Peônia'], array['Almíscar','Madeira clara'],
     3, array['quarto','banheiro'],
     'Rosa damascena e peônia abertas por lichia e pêssego, sem nenhum traço adocicado. É a mesma rosa que está em relevo na cerâmica dos nossos frascos.', 4),

    ('couro-e-vetiver', 'Couro & Vetiver', 'Amadeirado',
     array['Cardamomo','Zimbro'], array['Couro','Íris'], array['Vetiver','Musgo de carvalho'],
     5, array['escritorio','sala'],
     'Couro macio, íris e vetiver, com cardamomo na abertura. A fragrância mais marcante da casa, pensada para escritórios, halls e entradas de pé-direito alto.', 5),

    ('cha-branco-e-pera', 'Chá Branco & Pera', 'Cítrico',
     array['Pera williams','Bergamota'], array['Chá branco','Frésia'], array['Almíscar','Âmbar claro'],
     2, array['banheiro','quarto'],
     'Pera williams e chá branco, leves e transparentes. Limpa o ar sem ocupar espaço: é a escolha certa para banheiros, lavabos e ambientes pequenos.', 6),

    ('lavanda-de-provence', 'Lavanda de Provence', 'Herbal',
     array['Lavandin','Limão'], array['Lavanda','Sálvia'], array['Fava tonka','Cedro'],
     3, array['quarto','banheiro'],
     'Lavanda verdadeira, com sálvia e um fundo de fava tonka que tira o lado medicinal. Herbácea e calma, feita para o quarto e para a hora de desacelerar.', 7),

    ('baunilha-e-sandalo', 'Baunilha & Sândalo', 'Gourmand',
     array['Amêndoa','Bergamota'], array['Baunilha de Madagascar','Heliotrópio'], array['Sândalo','Benjoim'],
     4, array['sala','quarto'],
     'Baunilha de Madagascar e sândalo cremoso, com amêndoa na abertura. Doce sem ser enjoativa: é o cheiro de casa cheia, de domingo que não acaba.', 8)
),
fmt(chave, cat_slug, rotulo, prefixo, sku_fmt, preco, volume, peso, larg, alt, comp, imagens, texto) as (
  values
    ('difusor', 'difusores', 'Difusor de Varetas', 'difusor', 'DIF',
     189.90::numeric, null::int, 700, 10.0::numeric, 24.0::numeric, 10.0::numeric,
     array['/produtos/difusor-vidro.webp','/produtos/difusor-ceramico.webp'],
     'Difusor de varetas em frasco de vidro, com tampa dourada e laço de cetim. Perfuma de forma contínua, sem chama e sem tomada: a intensidade se regula no número de varetas, então comece com cinco e vá somando. Vire as varetas uma vez por semana para reavivar o perfume.'),

    ('home-spray', 'home-sprays', 'Home Spray', 'home-spray', 'SPR',
     139.90::numeric, 250::int, 650, 9.0::numeric, 20.0::numeric, 9.0::numeric,
     array['/produtos/home-spray.webp'],
     'Home spray em frasco de cerâmica branca com rosas em relevo e válvula cromada, feito para ficar à vista e não guardado no armário. Borrife a um palmo de distância, de preferência em cortinas e almofadas: é no tecido que o perfume se segura por mais tempo.'),

    ('sabonete', 'sabonetes-liquidos', 'Sabonete Líquido', 'sabonete', 'SAB',
     119.90::numeric, 250::int, 700, 9.0::numeric, 20.0::numeric, 9.0::numeric,
     array['/produtos/sabonete-liquido.webp'],
     'Sabonete líquido em frasco de cerâmica branca com rosas em relevo e válvula pump. Fórmula suave com glicerina vegetal, que limpa sem repuxar e deixa o perfume nas mãos depois do enxágue.'),

    ('refil', 'refis', 'Refil de Difusor', 'refil', 'REF',
     109.90::numeric, 250::int, 400, 7.0::numeric, 16.0::numeric, 7.0::numeric,
     array['/produtos/refil.webp'],
     'Refil de 250 ml para o seu difusor Aroma Haus. Mesma essência, menos vidro e menos preço: esvazie o frasco, complete com o refil e troque as varetas por um jogo novo.')
)
insert into public.products (
  category_id, name, slug, description, sku, price, compare_at_price, stock,
  weight_g, width_cm, height_cm, length_cm, images, featured,
  fragrance, olfactory_family, notes_top, notes_heart, notes_base, intensity, rooms, volume_ml,
  seo_title, seo_description
)
select
  c.id,
  fmt.rotulo || ' — ' || f.nome,
  fmt.prefixo || '-' || f.slug,
  fmt.texto || E'\n\n' || f.descricao,
  'AH-' || fmt.sku_fmt || '-' || upper(left(replace(f.slug, '-', ''), 6)),
  fmt.preco,
  -- Promoção em duas fragrâncias, para a vitrine ter o que marcar.
  case when f.pos in (2, 6) then round(fmt.preco * 1.22, 2) end,
  18 + ((f.pos * 7) % 23),
  fmt.peso, fmt.larg, fmt.alt, fmt.comp,
  fmt.imagens,
  (fmt.chave = 'difusor' and f.pos in (1, 3, 5))
    or (fmt.chave = 'home-spray' and f.pos in (2, 6)),
  f.nome, f.familia, f.topo, f.corpo, f.fundo, f.intensidade::smallint, f.ambientes, fmt.volume,
  fmt.rotulo || ' ' || f.nome || ' | Aroma Haus',
  left(f.descricao, 150)
from f
cross join fmt
join public.categories c on c.slug = fmt.cat_slug
on conflict (slug) do nothing;

-- ----------------------------------------------------------------
-- Variantes de tamanho — só os difusores têm duas medidas
-- ----------------------------------------------------------------
insert into public.product_variants (
  product_id, label, volume_ml, sku, price, compare_at_price, stock,
  weight_g, width_cm, height_cm, length_cm, position
)
select p.id, v.label, v.volume, p.sku || '-' || v.volume, v.preco,
       case when p.compare_at_price is not null then round(v.preco * 1.22, 2) end,
       v.estoque, v.peso, v.larg, v.alt, v.comp, v.pos
from public.products p
join public.categories c on c.id = p.category_id and c.slug = 'difusores'
cross join (values
  ('250 ml', 250, 189.90::numeric, 16, 700, 10.0::numeric, 24.0::numeric, 10.0::numeric, 1),
  ('500 ml', 500, 279.90::numeric,  9, 1200, 12.0::numeric, 28.0::numeric, 12.0::numeric, 2)
) as v(label, volume, preco, estoque, peso, larg, alt, comp, pos)
where not exists (
  select 1 from public.product_variants pv where pv.product_id = p.id and pv.label = v.label
);

-- ----------------------------------------------------------------
-- Kits
-- ----------------------------------------------------------------
insert into public.products (
  category_id, name, slug, description, sku, price, compare_at_price, stock,
  weight_g, width_cm, height_cm, length_cm, images, featured,
  fragrance, olfactory_family, intensity, rooms,
  seo_title, seo_description
)
select c.id, k.nome, k.slug, k.descricao, k.sku, k.preco, k.de, k.estoque,
       k.peso, 25.0, 30.0, 18.0, k.imagens, true,
       k.fragrancia, k.familia, k.intensidade::smallint, k.ambientes,
       k.nome || ' | Aroma Haus', left(k.descricao, 150)
from (values
  ('Kit Boas-Vindas — Âmbar Haus', 'kit-boas-vindas-ambar-haus',
   'O difusor de 250 ml e o home spray da mesma fragrância, na caixa de presente da casa. O difusor cuida do perfume de fundo, que fica; o spray resolve o antes das visitas. Acompanha cartão em papel algodão para a sua mensagem.',
   'AH-KIT-AMBAR', 299.90::numeric, 329.80::numeric, 12, 1400,
   array['/produtos/difusor-vidro.webp','/produtos/home-spray.webp'],
   'Âmbar Haus', 'Âmbar', 4, array['sala','escritorio']),

  ('Kit Lavabo — Rosa Pálida', 'kit-lavabo-rosa-palida',
   'Sabonete líquido e home spray em cerâmica branca com rosas em relevo, para o lavabo inteiro falar a mesma língua. É o kit que mais sai como presente de casa nova.',
   'AH-KIT-ROSA', 239.90::numeric, 259.80::numeric, 15, 1450,
   array['/produtos/sabonete-liquido.webp','/produtos/home-spray.webp'],
   'Rosa Pálida', 'Floral', 3, array['banheiro']),

  ('Kit Presente Haus — Couro & Vetiver', 'kit-presente-haus-couro-vetiver',
   'O difusor de 500 ml com um refil de 250 ml, para quem não quer pensar nisso de novo tão cedo. Mais de um ano de perfume na mesma fragrância, na caixa de presente da casa.',
   'AH-KIT-COURO', 369.90::numeric, 389.80::numeric, 8, 1700,
   array['/produtos/difusor-vidro.webp','/produtos/refil.webp'],
   'Couro & Vetiver', 'Amadeirado', 5, array['escritorio','sala'])
) as k(nome, slug, descricao, sku, preco, de, estoque, peso, imagens, fragrancia, familia, intensidade, ambientes)
join public.categories c on c.slug = 'kits-presentes'
on conflict (slug) do nothing;

-- ----------------------------------------------------------------
-- Avaliações de demonstração
--
-- Sem nota nenhuma a vitrine fica com o espaço das estrelas vazio e parece
-- quebrada. Ficam como `approved` e sem `user_id` — são conteúdo de exemplo,
-- não compras reais; apagar em Admin → Avaliações quando chegarem as de verdade.
-- ----------------------------------------------------------------
insert into public.reviews (product_id, author_name, rating, title, body, verified_purchase, status, created_at)
select p.id, r.autor, r.nota, r.titulo, r.texto, r.verificada, 'approved', now() - (r.dias || ' days')::interval
from (values
  ('difusor-ambar-haus', 'Marina C.', 5, 'Virou o cheiro da nossa casa',
   'Comprei para a sala e em dois dias a casa inteira estava com esse cheiro. Quente, sem ser doce demais. Já é o segundo frasco.', true, 6),
  ('difusor-ambar-haus', 'Rodrigo P.', 4, 'Ótimo, mas forte',
   'Fragrância linda. Só recomendo começar com quatro varetas em ambiente pequeno, com as oito que vêm na caixa fica intenso demais.', true, 19),
  ('difusor-rosa-palida', 'Helena M.', 5, 'Delicado de verdade',
   'Tinha medo de ser aquela rosa de sabonete antigo e não é nada disso. Fica fresco, limpo. O frasco é lindo no quarto.', true, 11),
  ('difusor-linho-branco', 'Camila A.', 5, 'Exatamente o que eu procurava',
   'Cheiro de lençol limpo, sem enjoar. Deixo no closet e abro a porta só para sentir.', true, 27),
  ('home-spray-flor-de-figo', 'Patrícia L.', 5, 'O preferido da casa',
   'Uso depois de cozinhar e resolve na hora. O vidro de cerâmica é muito bonito, fica na bancada.', true, 9),
  ('home-spray-cha-branco-e-pera', 'Juliana R.', 4, 'Leve e discreto',
   'Perfeito para o lavabo. Some um pouco rápido no ar, mas em toalha e cortina segura bem.', false, 15),
  ('sabonete-rosa-palida', 'Ana Beatriz', 5, 'As visitas sempre perguntam',
   'O frasco é uma peça de decoração. E o sabonete não resseca as mãos, que era o meu medo.', true, 22),
  ('sabonete-linho-branco', 'Fernanda T.', 5, 'Já comprei de novo',
   'Rende muito mais do que eu esperava e o cheiro fica nas mãos sem brigar com o perfume.', true, 34),
  ('refil-ambar-haus', 'Thiago M.', 5, 'Economia que vale',
   'Mesmo perfume do frasco original por bem menos. Chegou bem embalado, sem vazar nada.', true, 8),
  ('difusor-couro-e-vetiver', 'Gustavo F.', 5, 'Para o escritório, perfeito',
   'Amadeirado e seco, nada de doce. Clientes elogiam assim que entram na sala.', true, 13),
  ('kit-lavabo-rosa-palida', 'Letícia N.', 5, 'Presente certeiro',
   'Dei para a minha sogra na casa nova. A embalagem já vem pronta para presente, não precisei fazer nada.', true, 5)
) as r(prod, autor, nota, titulo, texto, verificada, dias)
join public.products p on p.slug = r.prod
where not exists (
  select 1 from public.reviews x where x.product_id = p.id and x.author_name = r.autor
);

-- ----------------------------------------------------------------
-- Blog — três pautas que respondem o que o cliente pergunta antes de comprar
-- ----------------------------------------------------------------
insert into public.blog_posts (title, slug, excerpt, content, author, tags, status, published_at, seo_title, seo_description)
select b.titulo, b.slug, b.resumo, b.conteudo, 'Aroma Haus', b.tags, 'published',
       now() - (b.dias || ' days')::interval, b.seo_t, b.seo_d
from (values
  ('Quantas varetas usar no difusor (e por que isso muda tudo)',
   'quantas-varetas-usar-no-difusor',
   'A mesma fragrância pode ser discreta ou invasiva dependendo de um detalhe que quase ninguém ajusta: o número de varetas.',
   E'# Quantas varetas usar no difusor\n\nO difusor não tem botão de volume — mas tem. Cada vareta é um canal: quanto mais varetas, mais essência sobe e mais rápido o frasco acaba.\n\n## A regra do ambiente\n\n- **Lavabo e banheiro (até 4 m²):** 3 a 4 varetas.\n- **Quarto (10 a 15 m²):** 5 a 6 varetas.\n- **Sala (20 m² ou mais):** 7 a 8 varetas.\n- **Pé-direito alto ou ambiente integrado:** 8 varetas e, se precisar, um segundo frasco em outro ponto.\n\n## Vire as varetas, mas não todo dia\n\nVirar reaviva o perfume porque traz para cima a parte já embebida. Uma vez por semana basta. Virar todo dia só faz o frasco acabar antes.\n\n## Onde colocar\n\nLonge de janela aberta, ventilador e ar-condicionado: a corrente de ar leva o perfume embora em vez de espalhar. Um aparador no meio da parede funciona melhor do que o peitoril.\n\n## Quanto tempo dura\n\nUm frasco de 250 ml com 5 varetas dura de 3 a 5 meses. Com 8 varetas, de 2 a 3. Quando acabar, use um refil: o frasco e as varetas novas fazem o resto.',
   array['difusor','como usar','perfumaria de ambiente'], 4,
   'Quantas varetas usar no difusor de ambiente | Aroma Haus',
   'Guia rápido por metragem: quantas varetas usar no difusor em lavabo, quarto e sala, de quanto em quanto tempo virar e quanto tempo o frasco dura.'),

  ('Como escolher a fragrância certa para cada cômodo',
   'fragrancia-certa-para-cada-comodo',
   'Cozinha, quarto e lavabo pedem famílias olfativas diferentes. Um mapa curto para não errar a compra.',
   E'# Uma fragrância para cada cômodo\n\nPerfumar a casa inteira com o mesmo cheiro raramente funciona. Cada ambiente tem uma função, e o perfume precisa acompanhar.\n\n## Quarto: fresco ou herbal\n\nO quarto pede fragrância que não disputa atenção na hora de dormir. **Linho Branco** e **Lavanda de Provence** cumprem esse papel — almíscar branco e lavanda baixam o ritmo em vez de acelerar.\n\n## Sala: âmbar ou amadeirado\n\nÉ o ambiente onde se recebe, e onde a fragrância pode ser a primeira coisa que a visita percebe. **Âmbar Haus** e **Baunilha & Sândalo** preenchem o espaço sem ficar enjoativos.\n\n## Lavabo e banheiro: cítrico\n\nEspaço pequeno satura rápido. Fragrância leve e transparente, como **Chá Branco & Pera**, limpa o ar sem pesar. Aqui o home spray costuma render mais do que o difusor.\n\n## Cozinha: verde\n\nContra cheiro de comida, o que funciona é verde e cítrico, não doce. **Flor de Figo** é a escolha da casa.\n\n## Escritório: amadeirado seco\n\n**Couro & Vetiver** mantém o ambiente sóbrio. Evite gourmand em sala de trabalho: doce em excesso cansa em jornada longa.',
   array['fragrâncias','guia de compra','decoração'], 12,
   'Qual fragrância usar em cada cômodo da casa | Aroma Haus',
   'Qual família olfativa combina com quarto, sala, lavabo, cozinha e escritório — e por que a mesma fragrância não serve para a casa inteira.'),

  ('Difusor, home spray ou vela: qual é o seu caso',
   'difusor-home-spray-ou-vela',
   'Os três perfumam, mas resolvem problemas diferentes. A diferença está em quanto tempo o perfume precisa durar.',
   E'# Difusor, home spray ou vela\n\n## Difusor: o perfume de fundo\n\nTrabalha sozinho, 24 horas por dia, por meses. É o que faz a casa ter um cheiro próprio — aquele que a visita sente na porta e o morador já nem percebe. Não tem chama, não usa tomada e não pede nada depois de montado.\n\n**Escolha se:** você quer que a casa tenha uma assinatura olfativa constante.\n\n## Home spray: o perfume de ocasião\n\nAge em segundos e vai embora em horas. É a ferramenta do antes das visitas, do depois de cozinhar, do quarto de hóspedes que ficou fechado a semana toda.\n\n**Escolha se:** você precisa de controle imediato, no momento exato.\n\n**Dica:** borrife em tecido, não no ar. Cortina, almofada e roupa de cama seguram o perfume muito mais tempo.\n\n## Os dois juntos\n\nÉ o que a maioria dos nossos clientes acaba fazendo, e é por isso que os kits combinam difusor e spray da mesma fragrância: o difusor sustenta o fundo, o spray reforça quando precisa. Mesma família olfativa, sem briga entre os dois.\n\n## E a vela?\n\nVela perfuma e aquece a cena, mas exige presença: não dá para acender e sair. Em casa com criança ou animal, o difusor resolve o mesmo problema sem o risco.',
   array['difusor','home spray','guia de compra'], 25,
   'Difusor, home spray ou vela: qual escolher | Aroma Haus',
   'A diferença prática entre difusor de varetas, home spray e vela perfumada — e em que situação cada um resolve melhor.')
) as b(titulo, slug, resumo, conteudo, tags, dias, seo_t, seo_d)
on conflict (slug) do nothing;


-- ===== 0012_conteudo_institucional.sql ===============================
-- ================================================================
-- 0012 — Conteúdo institucional da Aroma Haus (páginas + FAQ)
--
-- Gerado a partir de lib/pages-defaults.ts, que é o mesmo texto que a loja
-- serve quando o banco está vazio. Os dois andam juntos de propósito: página
-- institucional que diverge entre código e banco é a que ninguém percebe que
-- está errada.
--
-- Depois do deploy, quem manda é Admin → Páginas e Admin → FAQ.
-- Idempotente: ON CONFLICT (slug) DO NOTHING.
-- ================================================================

insert into public.pages (slug, title, seo_title, seo_description, content) values
  ('termos-de-uso',
   'Termos de uso',
   'Termos de uso',
   'Termos e condições de uso da loja Aroma Haus.',
   'Ao usar a loja **Aroma Haus**, você concorda com os termos abaixo.

## Produtos

Vendemos perfumaria de ambiente: difusores de varetas, home sprays, sabonetes líquidos, refis e kits. As fragrâncias são compostas e envasadas em pequenos lotes, o que significa que pode haver variação sutil de tonalidade do líquido entre lotes — isso é esperado e não afeta a fragrância.

As imagens são ilustrativas. O frasco de cerâmica é feito e pintado à mão; pequenas diferenças de relevo e acabamento fazem parte da peça.

## Pedidos e pagamentos

O pedido é confirmado depois da aprovação do pagamento. Podemos cancelar pedidos com indício de fraude ou com erro evidente de cadastro ou de preço, comunicando o cliente e devolvendo qualquer valor já pago.

## Uso dos produtos

Produtos de perfumaria de ambiente não são para consumo. Mantenha fora do alcance de crianças e animais, não ingira e evite contato com os olhos e com superfícies polidas, envernizadas ou pintadas — a essência pode manchar. Em caso de contato com a pele, lave com água e sabão.

## Propriedade intelectual

A marca, as fragrâncias, os textos e o layout desta loja pertencem à Aroma Haus e não podem ser reproduzidos sem autorização.'),
  ('trocas-e-devolucoes',
   'Trocas e devoluções',
   'Trocas e devoluções',
   'Política de trocas, devoluções e direito de arrependimento da Aroma Haus.',
   '## Direito de arrependimento

Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra em até **7 dias corridos** depois de receber o pedido. O produto precisa estar **lacrado e sem uso**, na embalagem original.

Perfumaria é um produto de contato: um difusor já aberto, com as varetas montadas, não pode voltar para o estoque nem ser revendido a outra pessoa. Por isso a devolução por arrependimento vale apenas para itens ainda lacrados.

## Chegou quebrado ou vazando

Acontece — vidro e cerâmica viajam mal. Nos avise em até **7 dias** do recebimento, com uma foto da peça e da caixa. Reenviamos o produto sem custo nenhum para você, e sem precisar devolver o que quebrou.

## Não gostei da fragrância

Fale com a gente. Cheiro é pessoal e sabemos que comprar sem sentir é um salto de fé: dentro de **15 dias**, trocamos por outra fragrância da casa de valor igual — você paga só o frete de volta. O produto precisa estar com pelo menos 80% do conteúdo.

## Como solicitar

Chame no WhatsApp com o número do pedido. Respondemos com as instruções de postagem. O reembolso sai depois de recebermos e conferirmos o produto, pelo mesmo meio de pagamento, em até 10 dias úteis.'),
  ('politica-de-privacidade',
   'Política de privacidade',
   'Política de privacidade',
   'Como a Aroma Haus coleta, usa e protege os seus dados pessoais (LGPD).',
   'A **Aroma Haus** respeita a sua privacidade e trata seus dados conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).

## Dados que coletamos

Coletamos o que você nos informa ao criar conta, fazer um pedido ou entrar em contato: nome, e-mail, telefone, CPF e endereço de entrega. Também registramos dados de navegação na loja para entender o que funciona e o que atrapalha.

O CPF é pedido porque o meio de pagamento e a emissão da etiqueta de envio exigem — não o usamos para mais nada.

## Como usamos

Para processar o pedido, calcular e despachar a entrega, dar suporte e cumprir obrigações legais e fiscais. **Não vendemos seus dados a ninguém.**

## Com quem compartilhamos

Apenas com quem é necessário para o pedido existir: o gateway de pagamento, a transportadora e o serviço de e-mail transacional — e sempre no limite do que cada um precisa.

## Mensagem de presente

Quando você escreve uma mensagem de presente, ela é lida pela pessoa que prepara o pedido, impressa no cartão e apagada do painel depois do envio.

## Seus direitos

Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo nosso WhatsApp ou e-mail. Respondemos em até 15 dias.')
on conflict (slug) do nothing;

insert into public.faq_items (question, answer, position) values
  ('Quanto tempo dura um difusor?', 'Um frasco de 250 ml com 5 varetas dura de 3 a 5 meses; o de 500 ml, de 6 a 10. Quanto mais varetas, mais intenso o perfume e mais rápido ele acaba. Ambiente com ar-condicionado ou corrente de ar consome mais depressa.', 1),
  ('Quantas varetas devo usar?', '3 a 4 em lavabo e banheiro, 5 a 6 em quarto, 7 a 8 em sala. Comece com menos e vá somando: dá para aumentar, mas não dá para tirar o perfume do ar depois.', 2),
  ('Preciso virar as varetas?', 'Uma vez por semana basta. Virar reaviva o perfume porque traz para cima a parte já embebida; virar todo dia só faz o frasco acabar antes.', 3),
  ('O refil serve em qualquer frasco?', 'Sim, o refil de 250 ml serve em qualquer difusor Aroma Haus. Esvazie o que sobrou, complete com o refil e troque as varetas — vareta velha já está saturada e não puxa mais.', 4),
  ('Qual a diferença entre difusor e home spray?', 'O difusor é o perfume de fundo: trabalha sozinho por meses e dá à casa um cheiro próprio. O home spray é o de ocasião: age em segundos e vai embora em horas. A maioria dos nossos clientes usa os dois na mesma fragrância.', 5),
  ('Vocês embrulham para presente?', 'Sim, sem custo. Marque a opção no checkout e escrevemos à mão a sua mensagem no cartão. A nota fiscal vai fora da caixa, sem nenhum preço à vista.', 6),
  ('Vocês entregam em todo o Brasil?', 'Sim. O frete é calculado no checkout pelo seu CEP. Vidro e cerâmica vão com proteção dupla, e se chegar quebrado a gente reenvia sem custo.', 7),
  ('Posso usar o home spray direto no tecido?', 'Pode, e é onde ele rende mais — cortina, almofada e roupa de cama seguram o perfume por muito mais tempo que o ar. Borrife a um palmo de distância. Em tecido delicado ou de cor clara, teste antes numa parte escondida.', 8)
on conflict do nothing;
