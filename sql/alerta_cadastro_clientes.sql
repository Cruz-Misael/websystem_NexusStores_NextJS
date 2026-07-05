-- ============================================================================
-- ALERTA DE CADASTRO DE CLIENTES DESATUALIZADO (6+ meses sem edição)
--
-- Adiciona a coluna updated_at em people, mantida automaticamente por trigger.
-- Cadastros existentes começam contando a partir do created_at.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

-- Coluna updated_at (inicializa com created_at para os registros existentes)
alter table public.people add column if not exists updated_at timestamptz;

update public.people set updated_at = created_at where updated_at is null;

alter table public.people alter column updated_at set default now();
alter table public.people alter column updated_at set not null;

-- Trigger: toda edição no cadastro renova o updated_at automaticamente
create or replace function public.set_people_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at
  before update on public.people
  for each row execute function public.set_people_updated_at();

-- Índice para a consulta do alerta (clientes ativos ordenados por atualização)
create index if not exists idx_people_updated_at
  on public.people (updated_at) where is_active = true;
