-- ============================================================================
-- FECHAR O BANCO (RLS, papéis e privilégios)
--
-- O PROBLEMA, medido em 20/09/2026
-- A chave pública do projeto (NEXT_PUBLIC_SUPABASE_ANON_KEY) viaja dentro do
-- JavaScript da loja online — qualquer visitante a lê pelo navegador. Com ela,
-- SEM NENHUM LOGIN, era possível ler e escrever em todas as 30 tabelas:
--   · operators.pin                           (PIN que autoriza desconto no caixa)
--   · website_config.mercadopago_access_token (token de produção de pagamentos)
--   · people                                  (nome, CPF, telefone, endereço)
--   · products.cost                           (margem da loja)
--   · sales, payables, authorized_users...    (tudo o mais)
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
--   1. Cria o schema `private` (fora do alcance da API) e, nele, a função que
--      responde "quem está pedindo é operador ativo?"
--   2. Apaga todas as políticas antigas do schema public (estado limpo)
--   3. Liga RLS em todas as tabelas, com duas políticas por tabela: o painel
--      exige operador ativo; o servidor (rotas /api/*, chave de serviço) segue
--      liberado por política explícita
--   4. Revoga todo privilégio do papel anon — a chave pública deixa de abrir
--      qualquer porta, inclusive em tabelas criadas no futuro
--
-- SEGURO PARA A LOJA ONLINE: o site público não consulta o banco direto (zero
-- chamadas com a chave anônima); tudo passa pelas rotas /api/loja/*, que rodam
-- no servidor com a chave de serviço.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute de uma vez. É idempotente.
-- Rode ANTES de cobrancas.sql, email_remetente.sql e historico_venda.sql.
-- ============================================================================


-- ── 1. Quem é operador do sistema ───────────────────────────────────────────
-- Mora em `private` porque o PostgREST só expõe `public`: assim a função não
-- vira um endpoint RPC. SECURITY DEFINER para consultar authorized_users sem
-- esbarrar na RLS dessa própria tabela — a verificação não pode depender de si
-- mesma. O search_path vazio obriga nomes completos e evita sequestro de nome.
create schema if not exists private;

create or replace function private.eh_operador_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.authorized_users au
     where au.user_id = (select auth.uid())
       and au.status  = 'ativo'
  );
$$;

comment on function private.eh_operador_ativo() is
  'True quando o usuário logado é operador com status ativo. Base das políticas do painel.';

-- Índice para o lookup que a função faz a cada consulta.
create index if not exists authorized_users_user_id_status_idx
  on public.authorized_users (user_id, status);


-- ── 2 e 3. Políticas ────────────────────────────────────────────────────────
do $$
declare
  r record;
  t text;
begin
  -- Estado limpo: políticas se somam (OR), então uma permissiva esquecida
  -- anularia todo o resto. Removemos todas antes de recriar.
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;

  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Painel: só operador com status ativo.
    -- O (select ...) em volta da função faz a checagem rodar UMA vez por
    -- consulta em vez de uma vez por linha — em sale_items isso é a diferença
    -- entre abrir a tela de vendas num piscar e varrer a tabela inteira.
    execute format($f$
      create policy operador_ativo on public.%I
        for all
        to authenticated
        using ((select private.eh_operador_ativo()))
        with check ((select private.eh_operador_ativo()))
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
-- Sem privilégio de tabela, o papel anon leva "permission denied" antes mesmo
-- de qualquer política ser avaliada.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines  in schema public from anon;

-- E o que for criado daqui em diante já nasce fechado para anon.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines  from anon;

-- O operador precisa do privilégio de tabela; quem filtra o que ele enxerga
-- são as políticas acima, não a falta de grant.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- O schema private não é exposto pela API (o PostgREST só publica `public`),
-- mas quem consulta precisa PODER executar a função: a política é avaliada no
-- contexto de quem faz a consulta, não do sistema. Sem este grant, o operador
-- leva "permission denied for function" e o painel inteiro para — foi o que o
-- ensaio desta migration mostrou antes de qualquer coisa ir para o banco.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

revoke execute on function private.eh_operador_ativo() from public, anon;
grant  execute on function private.eh_operador_ativo() to authenticated, service_role;

-- Funções de negócio (RPC): só operador logado e servidor.
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
