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
