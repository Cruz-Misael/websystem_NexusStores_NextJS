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

-- RLS no mesmo padrão das demais tabelas ------------------------------------
do $$
begin
  alter table public.email_settings enable row level security;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'email_settings' and policyname = 'authenticated_all'
  ) then
    create policy authenticated_all on public.email_settings
      for all to authenticated using (true) with check (true);
  end if;
end $$;

select * from public.email_settings;
