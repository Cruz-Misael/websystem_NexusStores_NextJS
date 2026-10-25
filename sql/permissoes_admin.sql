-- ============================================================================
-- SÓ ADMIN MEXE EM USUÁRIOS E OPERADORES; SÓ OPERADOR ENVIA ARQUIVO
--
-- O PROBLEMA, medido em 24/10/2026
-- seguranca_rls.sql deu a mesma política a todas as tabelas: operador ativo lê
-- e escreve. Em authorized_users isso quer dizer que QUALQUER operador — um
-- colaborador, por exemplo — pode, com a própria sessão e direto na API, se
-- promover a admin, desativar o admin de verdade ou apagar a conta dele. A
-- tela esconde esses botões de quem não é admin, mas o banco aceitava. Em
-- operators é igual: qualquer operador cria, altera ou apaga operador de caixa
-- (e o PIN de gerente que libera desconto).
--
-- No storage, a política de envio do bucket `logos` aceitava qualquer
-- `authenticated`. Como o login com Google é aberto, qualquer pessoa que entre
-- com Google — mesmo sem estar cadastrada, levando "acesso negado" na tela —
-- ganha uma sessão válida e podia hospedar arquivos no bucket, que é público.
--
-- O QUE ESTE SCRIPT FAZ
--   1. Cria private.eh_admin_ativo(), irmã de private.eh_operador_ativo().
--   2. authorized_users e operators: operador ativo continua LENDO; inserir,
--      alterar e apagar passa a exigir admin ativo.
--   3. storage `logos`: enviar arquivo passa a exigir operador ativo.
--
-- O QUE NÃO MUDA
--   · As rotas /api/create-user, /api/update-user e /api/update-user-password
--     usam a chave de serviço (política `servidor`) e já checam papel admin.
--   · Login, sino, menu e telas que só leem o papel de quem está logado.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute. É idempotente.
-- Rode DEPOIS de seguranca_rls.sql.
-- ============================================================================


-- ── 1. Quem é admin ─────────────────────────────────────────────────────────
-- Mesmo desenho de eh_operador_ativo: SECURITY DEFINER para consultar
-- authorized_users sem esbarrar na RLS dessa própria tabela, e search_path
-- vazio para não haver sequestro de nome.
create or replace function private.eh_admin_ativo()
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
       and au.role    = 'admin'
  );
$$;

comment on function private.eh_admin_ativo() is
  'True quando o usuário logado é admin com status ativo. Guarda a escrita em authorized_users e operators.';

revoke execute on function private.eh_admin_ativo() from public, anon;
grant  execute on function private.eh_admin_ativo() to authenticated, service_role;


-- ── 2. Usuários e operadores: todos leem, só admin escreve ──────────────────
-- Políticas se somam (OR) por comando. Na leitura valem as duas — e quem é
-- admin já é operador. Em insert/update/delete só a de admin se aplica.
do $$
declare t text;
begin
  foreach t in array array['authorized_users', 'operators']
  loop
    execute format('drop policy if exists operador_ativo on public.%I', t);
    execute format('drop policy if exists operador_le on public.%I', t);
    execute format('drop policy if exists admin_gerencia on public.%I', t);

    execute format($f$
      create policy operador_le on public.%I
        for select
        to authenticated
        using ((select private.eh_operador_ativo()))
    $f$, t);

    execute format($f$
      create policy admin_gerencia on public.%I
        for all
        to authenticated
        using ((select private.eh_admin_ativo()))
        with check ((select private.eh_admin_ativo()))
    $f$, t);
  end loop;
end $$;


-- ── 3. Envio de arquivo: só operador ativo ──────────────────────────────────
drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists operador_envia_logo on storage.objects;

create policy operador_envia_logo on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'logos' and (select private.eh_operador_ativo()));
