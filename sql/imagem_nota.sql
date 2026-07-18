-- ============================================================================
-- IMAGEM NA NOTA/RECIBO (ex.: QR code do PIX)
--
-- Adiciona companies.receipt_image_url -> URL da imagem exibida na notinha.
-- A imagem é enviada ao mesmo storage do logo (bucket "logos").
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

alter table public.companies add column if not exists receipt_image_url text;
comment on column public.companies.receipt_image_url is
  'URL de uma imagem exibida na notinha/recibo (ex.: QR code do PIX).';
