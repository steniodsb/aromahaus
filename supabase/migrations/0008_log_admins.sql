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
