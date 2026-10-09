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
