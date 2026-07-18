-- ============================================================================
-- MELHORIAS: CONFIG DA NOTA + DATA DE FECHAMENTO DO CONSIGNADO + OBS. INTERNA
--
-- 1) companies.pix_key      -> chave PIX exibida na notinha (ao lado do CNPJ).
-- 2) companies.receipt_note -> texto livre/rodapé configurável da notinha.
-- 3) sales.settled_at       -> data/hora de fechamento do consignado (quando pago).
-- 4) sales.internal_note    -> observação interna da venda (NÃO sai na notinha).
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

-- 1) e 2) Configurações da nota fiscal na empresa ---------------------------
alter table public.companies add column if not exists pix_key text;
comment on column public.companies.pix_key is
  'Chave PIX exibida na notinha/recibo (ao lado do CNPJ).';

alter table public.companies add column if not exists receipt_note text;
comment on column public.companies.receipt_note is
  'Texto livre/rodapé configurável exibido na notinha/recibo.';

-- 3) Data de fechamento do consignado ---------------------------------------
alter table public.sales add column if not exists settled_at timestamptz;
comment on column public.sales.settled_at is
  'Data/hora em que o consignado foi fechado (pago). NULL = ainda não fechado.';

-- 4) Observação interna da venda (não impressa na nota) ---------------------
alter table public.sales add column if not exists internal_note text;
comment on column public.sales.internal_note is
  'Observação interna da venda, preenchida manualmente. Não aparece na notinha.';
