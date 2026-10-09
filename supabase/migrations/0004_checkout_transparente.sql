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
