-- ============================================================================
-- SEGMENTAÇÃO DE PESSOAS: CLIENTE x CONSULTORA
--
-- Adiciona people.person_type para distinguir clientes de consultoras.
--   'consultora' = consultora/revendedora (padrão)
--   'cliente'    = cliente comum
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

-- 1) Coluna de tipo da pessoa ------------------------------------------------
alter table public.people
  add column if not exists person_type text not null default 'consultora';

comment on column public.people.person_type is
  'Tipo da pessoa: consultora (padrão) ou cliente.';

-- 2) Restringe os valores possíveis (recria a constraint de forma idempotente)
alter table public.people
  drop constraint if exists people_person_type_check;

alter table public.people
  add constraint people_person_type_check
  check (person_type in ('cliente', 'consultora'));

-- 3) Índice para o filtro de visão (cliente/consultora) ----------------------
create index if not exists idx_people_person_type
  on public.people (person_type);
