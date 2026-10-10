-- ================================================================
-- 0013 — Correções de segurança
--
-- ⚠️  APLIQUE ESTA MIGRAÇÃO ANTES DE ABRIR A LOJA AO PÚBLICO.
--     O item SEG-01 permite que qualquer pessoa que se cadastre na loja
--     vire administradora. Não é teórico: é um PATCH de uma linha.
--
-- Idempotente: pode rodar mais de uma vez.
-- ================================================================

-- ----------------------------------------------------------------
-- SEG-01 (CRÍTICO) — escalada de privilégio em profiles.is_admin
--
-- A policy antiga era:
--     for update using (auth.uid() = id or public.is_admin());
--
-- Sem `with check`, o Postgres reaproveita a expressão do `using` para
-- validar a linha NOVA. A única exigência virava "o id continua sendo o
-- meu" — e nada impedia escrever a coluna `is_admin`. Qualquer cliente
-- cadastrado fazia
--
--     PATCH /rest/v1/profiles?id=eq.<seu-uid>   {"is_admin": true}
--
-- e entrava no painel: CPF, telefone e endereço de todos os clientes,
-- estorno de pagamento, preço, cupom — e `settings.pixels.head_html`, que
-- injeta JavaScript em todas as páginas da loja, inclusive no checkout.
--
-- A correção é dupla de propósito. A policy separa o que o dono da linha
-- pode fazer do que o admin pode fazer; o gatilho é o cinto de segurança,
-- para que nem um erro futuro de policy devolva a brecha.
-- ----------------------------------------------------------------
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

do $$ begin
  create policy "profiles_update_admin" on public.profiles
    for update using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

create or replace function public.protect_is_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'is_admin só pode ser alterado por um administrador';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_protect_admin on public.profiles;
create trigger trg_profiles_protect_admin
  before update on public.profiles
  for each row execute function public.protect_is_admin();

-- ----------------------------------------------------------------
-- SEG-02 (MÉDIO) — settings era legível por qualquer pessoa
--
-- A policy era `for select using (true)`. Hoje a tabela está vazia desses
-- dados, mas o formulário de Admin → Configurações grava ali o CPF/CNPJ do
-- lojista, o telefone e o endereço completo de origem (obrigatórios para
-- gerar etiqueta no Melhor Envio). No minuto em que o lojista preencher,
-- tudo isso fica público — basta a chave anon, que vai no bundle do site.
--
-- A loja só precisa de leitura pública em três chaves. O resto passa a ser
-- lido pelo service-role, que é o que `lib/store.ts` já usa.
-- ----------------------------------------------------------------
drop policy if exists "settings_public_read" on public.settings;

create policy "settings_public_read" on public.settings
  for select using (
    key in ('banners', 'pixels', 'mini_banners', 'promo_banner', 'home_sections')
    or public.is_admin()
  );

-- ----------------------------------------------------------------
-- SEG-03 — índice único das avaliações era PARCIAL, e o upsert falhava
--
-- O índice era `... where user_id is not null`. O Postgres só infere um
-- índice parcial num `ON CONFLICT` se a cláusula repetir o mesmo predicado,
-- e o PostgREST não repete. Toda tentativa de enviar avaliação morria em
--
--     42P10: there is no unique or exclusion constraint matching the
--            ON CONFLICT specification
--
-- ou seja: nenhum cliente conseguia avaliar. A action já exige login, então
-- `user_id` nunca é nulo e o predicado não servia para nada.
-- ----------------------------------------------------------------
drop index if exists public.idx_reviews_user_product;

create unique index if not exists idx_reviews_user_product
  on public.reviews (user_id, product_id);

-- ----------------------------------------------------------------
-- SEG-04 — limite de uso de cupom era furável por corrida
--
-- `validateCoupon` lia `used_count` e só depois `redeemCoupon` incrementava,
-- sem `await` e depois de criar o pedido. Entre a leitura e a escrita cabe
-- uma chamada ao gateway inteira: N checkouts simultâneos com o mesmo cupom
-- passavam todos pela validação.
--
-- `reserve_coupon` decide e incrementa na mesma instrução, no banco. Zero
-- linhas afetadas significa que o limite estourou.
-- ----------------------------------------------------------------
create or replace function public.reserve_coupon(p_coupon_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare reservado boolean;
begin
  update public.coupons
     set used_count = used_count + 1
   where id = p_coupon_id
     and is_active
     and (max_uses is null or used_count < max_uses)
  returning true into reservado;
  return coalesce(reservado, false);
end $$;

/** Devolve a reserva quando o pedido não chega a existir. */
create or replace function public.release_coupon(p_coupon_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.coupons
     set used_count = greatest(0, used_count - 1)
   where id = p_coupon_id;
end $$;

revoke all on function public.reserve_coupon(uuid) from public, anon, authenticated;
revoke all on function public.release_coupon(uuid) from public, anon, authenticated;
