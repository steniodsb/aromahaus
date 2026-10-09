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
