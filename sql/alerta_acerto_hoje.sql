-- ============================================================================
-- ALERTA DE ACERTO NO DIA (consignado que vence hoje)
--
-- Até aqui o sino só avisava do acerto ATRASADO ("sale_delayed"). O aviso novo,
-- "sale_due_today", dispara no próprio dia do vencimento, para dar tempo de
-- cobrar a revendedora antes de virar atraso.
--
-- A coluna notifications.type tem um CHECK que lista os tipos aceitos, então
-- sem rodar isto o insert do tipo novo é REJEITADO pelo banco (erro 23514) e o
-- alerta simplesmente nunca aparece.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

-- Recria o CHECK incluindo 'sale_due_today'. Descobre o nome real da constraint
-- em vez de assumir 'notifications_type_check', e não falha se ela não existir.
do $$
declare
  nome_constraint text;
begin
  select con.conname
    into nome_constraint
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
   where nsp.nspname = 'public'
     and rel.relname = 'notifications'
     and con.contype = 'c'
     and pg_get_constraintdef(con.oid) ilike '%type%'
   limit 1;

  if nome_constraint is not null then
    execute format('alter table public.notifications drop constraint %I', nome_constraint);
  end if;

  alter table public.notifications
    add constraint notifications_type_check
    check (type in ('stock_critical', 'sale_delayed', 'sale_due_today', 'customer_stale'));
end $$;

-- Confere: deve listar os quatro tipos aceitos
select pg_get_constraintdef(con.oid) as definicao_do_check
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
 where nsp.nspname = 'public'
   and rel.relname = 'notifications'
   and con.conname = 'notifications_type_check';
