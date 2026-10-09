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
