-- ============================================================================
-- REMETENTE DOS E-MAILS (configurável pela loja, sem redeploy)
--
-- Até aqui o remetente vinha só da variável de ambiente FROM_EMAIL, que está
-- valendo "Pedidos <onboarding@resend.dev>" — o endereço de teste do Resend,
-- que só entrega para o dono da conta. Ou seja: e-mail de pedido e de cobrança
-- não chegavam a ninguém, e o erro era engolido.
--
-- Com esta tabela a loja configura remetente e "responder para" direto em
-- Configurações › E-mail. O que continua fora do sistema é verificar o domínio
-- no painel do Resend (exige registros de DNS).
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

create table if not exists public.email_settings (
  id           int primary key default 1,
  -- Nome que aparece na caixa de entrada (ex.: "Íntima Sedução")
  from_name    text not null default '',
  -- Endereço remetente. Precisa pertencer a um domínio verificado no Resend.
  -- Vazio = cai no FROM_EMAIL do ambiente.
  from_address text not null default '',
  -- Para onde vão as respostas. Pode ser qualquer e-mail (Gmail serve),
  -- porque o reply-to não passa pela verificação de domínio.
  reply_to     text not null default '',
  updated_at   timestamptz not null default now(),
  constraint email_settings_singleton check (id = 1)
);

comment on table public.email_settings is
  'Remetente dos e-mails transacionais (pedido e cobrança). Sempre uma única linha (id = 1).';

insert into public.email_settings (id) values (1) on conflict (id) do nothing;

-- RLS: só operador ativo. A função public.eh_operador_ativo() vem de
-- sql/seguranca_rls.sql — rode aquele arquivo ANTES deste.
do $$
declare t text;
begin
  foreach t in array array['email_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Remove o padrão antigo, que liberava tudo para qualquer autenticado
    execute format('drop policy if exists authenticated_all on public.%I', t);
    execute format('drop policy if exists operador_ativo on public.%I', t);
    execute format('drop policy if exists servidor on public.%I', t);
    execute format(
      'create policy operador_ativo on public.%I for all to authenticated '
      'using (public.eh_operador_ativo()) with check (public.eh_operador_ativo())', t);
    -- As rotas /api/* entram pela chave de serviço
    execute format(
      'create policy servidor on public.%I for all to service_role '
      'using (true) with check (true)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on all sequences in schema public from anon;

select * from public.email_settings;
