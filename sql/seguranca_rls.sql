-- ============================================================================
-- FECHAR O BANCO (RLS, papéis e privilégios)
--
-- O PROBLEMA, medido em 20/09/2026
-- A chave pública do projeto (NEXT_PUBLIC_SUPABASE_ANON_KEY) viaja dentro do
-- JavaScript da loja online — qualquer visitante a lê pelo navegador. Com ela,
-- SEM NENHUM LOGIN, era possível ler e escrever em todas as 30 tabelas:
--   · operators.pin                        (o PIN que autoriza desconto no caixa)
--   · website_config.mercadopago_access_token (token de produção de pagamentos)
--   · people                               (nome, CPF, telefone, endereço)
--   · products.cost                        (margem da loja)
--   · sales, payables, authorized_users... (tudo o mais)
-- Escrita também passava: um POST em people criou registro de verdade no teste.
--
-- POR QUE
-- Todas as políticas seguiam o padrão `for all to authenticated using (true)`,
-- e os privilégios de tabela estavam concedidos também ao papel anon. Some-se
-- que os clientes da loja online fazem login com Google NO MESMO projeto: cada
-- cliente que já comprou é um `authenticated` legítimo, e `using (true)` dava a
-- todos eles o sistema inteiro.
--
-- O QUE ESTE SCRIPT FAZ
--   1. Cria a função que responde "quem está pedindo é operador ativo?"
--   2. Apaga todas as políticas antigas do schema public (estado limpo)
--   3. Liga RLS em todas as tabelas e cria duas políticas por tabela: o painel
--      exige operador com status ativo em authorized_users; o servidor (rotas
--      /api/*, que usam a chave de serviço) continua liberado
--   4. Revoga todo privilégio do papel anon — a chave pública deixa de abrir
--      qualquer porta
--   5. Confere o resultado
--
-- SEGURO PARA A LOJA ONLINE: o site público não consulta o banco direto (zero
-- chamadas com a chave anônima); tudo passa pelas rotas /api/loja/*, que rodam
-- no servidor com a chave de serviço — e essas ganham política própria aqui,
-- em vez de dependerem do bypass implícito do projeto.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute de uma vez. É idempotente.
-- Rode ANTES de cobrancas.sql, email_remetente.sql e historico_venda.sql.
-- ============================================================================


-- ── 1. Quem é operador do sistema ───────────────────────────────────────────
-- SECURITY DEFINER para poder consultar authorized_users sem esbarrar na
-- própria RLS dessa tabela (senão a verificação dependeria de si mesma).
create or replace function public.eh_operador_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.authorized_users au
     where au.user_id = auth.uid()
       and au.status  = 'ativo'
  );
$$;

comment on function public.eh_operador_ativo() is
  'True quando o usuário logado é operador com status ativo. Base de todas as políticas do painel.';

revoke execute on function public.eh_operador_ativo() from public, anon;
grant  execute on function public.eh_operador_ativo() to authenticated;


-- ── 2 e 3. Políticas: uma por tabela, exigindo operador ativo ───────────────
do $$
declare
  r record;
  t text;
begin
  -- Estado limpo: qualquer política permissiva esquecida continuaria valendo,
  -- porque políticas se somam (OR). Removemos todas antes de recriar.
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;

  -- RLS ligada e política única em cada tabela do schema public
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Painel: só operador com status ativo.
    execute format($f$
      create policy operador_ativo on public.%I
        for all
        to authenticated
        using (public.eh_operador_ativo())
        with check (public.eh_operador_ativo())
    $f$, t);

    -- Servidor: as rotas /api/* usam a chave de serviço, que normalmente já
    -- ignora RLS. Declaramos a permissão mesmo assim, para o funcionamento da
    -- loja online não depender desse detalhe de configuração do projeto.
    execute format($f$
      create policy servidor on public.%I
        for all
        to service_role
        using (true)
        with check (true)
    $f$, t);
  end loop;
end $$;


-- ── 4. A chave pública deixa de abrir portas ────────────────────────────────
-- Sem nenhum privilégio de tabela, o papel anon recebe "permission denied"
-- antes mesmo de qualquer política ser avaliada.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines  in schema public from anon;

-- E o que for criado daqui em diante já nasce fechado para anon.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines  from anon;

-- O operador continua precisando dos privilégios de tabela; quem filtra o que
-- ele enxerga são as políticas acima, não a falta de grant.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Funções de negócio: só operador logado.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
  loop
    execute format('revoke execute on function %s from public, anon', f.assinatura);
    execute format('grant  execute on function %s to authenticated, service_role', f.assinatura);
  end loop;
end $$;


-- ── 5. Conferência ──────────────────────────────────────────────────────────
-- (a) Toda tabela deve aparecer com rls_ligada = true e as duas políticas
--     (operador_ativo e servidor).
select
  c.relname                                   as tabela,
  c.relrowsecurity                            as rls_ligada,
  count(p.policyname)                         as politicas,
  coalesce(string_agg(p.policyname, ', '), '—') as quais
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;

-- (b) Esta consulta tem que voltar VAZIA: nenhum privilégio para anon.
select table_name, privilege_type
  from information_schema.role_table_grants
 where grantee = 'anon' and table_schema = 'public'
 order by table_name;
