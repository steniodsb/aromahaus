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
