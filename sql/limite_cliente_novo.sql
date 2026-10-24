-- ============================================================================
-- LIMITE DE VENDA PARA CLIENTES NOVOS + AUTORIZAÇÃO POR PIN DE GERENTE
--
-- 1) Adiciona people.sales_limit (limite em R$ por venda para o cliente).
--    NULL = sem limite definido / cliente já liberado.
-- 2) Cria a função validate_manager_pin(p_pin) que confere se o PIN informado
--    pertence a algum operador ATIVO com categoria 'manager' (Gerente).
--    Mantém os PINs no servidor — o front nunca recebe a lista de PINs.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

-- 1) Coluna de limite de venda no cadastro do cliente ------------------------
alter table public.people add column if not exists sales_limit numeric;

comment on column public.people.sales_limit is
  'Limite em R$ por venda para o cliente. NULL = sem limite / cliente liberado.';

-- 2) Validação de PIN de gerente --------------------------------------------
create or replace function public.validate_manager_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.operators o
    where o.is_active = true
      and o.role = 'manager'
      and o.pin is not null
      and o.pin = p_pin
  );
$$;

-- Permite chamar a função via RPC pelo cliente autenticado (e anon, se usado)
grant execute on function public.validate_manager_pin(text) to anon, authenticated;
