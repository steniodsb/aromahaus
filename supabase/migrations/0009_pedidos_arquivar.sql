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
