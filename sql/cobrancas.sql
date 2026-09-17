-- ============================================================================
-- COBRANÇA DE CONSIGNADO (WhatsApp com um clique + e-mail automático)
--
-- Cria as duas tabelas que a tela "Cobranças" usa:
--
--   collection_settings  — linha única (id = 1) com os textos das mensagens e
--                          as regras do disparo automático de e-mail.
--   collection_messages  — histórico de toda cobrança enviada. É o que impede
--                          o automático de mandar e-mail para a mesma pessoa
--                          todo santo dia, e o que alimenta a coluna "última
--                          cobrança" da tela.
--
-- Quem está atrasado continua saindo da observação da venda ("Pagamento
-- previsto: YYYY-MM-DD"), do mesmo jeito que o sino de notificações já faz —
-- não há coluna nova em sales.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

-- 1) Configuração da cobrança ------------------------------------------------
create table if not exists public.collection_settings (
  id                      int primary key default 1,
  -- Disparo automático de e-mail (a rota /api/cobrancas/cron só envia se true)
  auto_email_enabled      boolean not null default false,
  -- Cobrar também quem vence hoje, não só quem já está atrasado
  send_on_due_date        boolean not null default false,
  -- Intervalo mínimo, em dias, entre dois e-mails automáticos para a mesma venda
  min_days_between_emails int not null default 3,
  -- Textos (aceitam as variáveis {cliente} {primeiro_nome} {venda} {valor}
  -- {data_prevista} {dias_atraso} {itens} {loja})
  whatsapp_template       text not null default
    'Oi {primeiro_nome}, tudo bem? Passando para lembrar do acerto do consignado #{venda}, no valor de {valor}, que estava previsto para {data_prevista}. Quando puder, me avisa como prefere acertar? Se já tiver acertado, pode ignorar esta mensagem. Obrigada! — {loja}',
  email_subject           text not null default
    'Lembrete de acerto — consignado #{venda}',
  email_intro             text not null default
    'Passando para lembrar do acerto do consignado abaixo. Quando puder, é só responder este e-mail ou falar com a gente no WhatsApp para combinar. Se já tiver acertado, pode ignorar esta mensagem.',
  updated_at              timestamptz not null default now(),
  constraint collection_settings_singleton check (id = 1)
);

comment on table public.collection_settings is
  'Textos e regras da cobrança de consignado. Sempre uma única linha (id = 1).';

insert into public.collection_settings (id) values (1) on conflict (id) do nothing;

-- 2) Histórico de cobranças enviadas -----------------------------------------
create table if not exists public.collection_messages (
  id          bigserial primary key,
  sale_id     bigint not null references public.sales(id) on delete cascade,
  customer_id bigint references public.people(id) on delete set null,
  -- Por onde foi: 'whatsapp' é registrado quando o operador clica e o link abre;
  -- 'email' quando o Resend aceita o envio.
  channel     text not null check (channel in ('whatsapp', 'email')),
  -- Quem disparou: 'manual' (alguém clicou) ou 'auto' (cron diário)
  origin      text not null default 'manual' check (origin in ('manual', 'auto')),
  status      text not null default 'sent' check (status in ('sent', 'failed')),
  error       text,
  days_late   int,
  amount      numeric,
  -- Número ou e-mail efetivamente usado, para auditoria da cobrança
  destination text,
  -- authorized_users.user_id de quem clicou; null quando foi o automático
  sent_by     uuid,
  sent_at     timestamptz not null default now()
);

comment on table public.collection_messages is
  'Toda cobrança de consignado enviada (WhatsApp ou e-mail). Serve de auditoria e de trava anti-repetição do envio automático.';

create index if not exists collection_messages_sale_idx
  on public.collection_messages (sale_id, sent_at desc);

create index if not exists collection_messages_channel_idx
  on public.collection_messages (channel, sent_at desc);

-- 3) RLS ---------------------------------------------------------------------
-- Mesmo padrão das demais tabelas do sistema: liberado para autenticado, e o
-- que roda no servidor usa a service_role (que ignora RLS).
do $$
declare
  t text;
begin
  foreach t in array array['collection_settings', 'collection_messages'] loop
    execute format('alter table public.%I enable row level security', t);

    if not exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = t and policyname = 'authenticated_all'
    ) then
      execute format(
        'create policy authenticated_all on public.%I for all to authenticated using (true) with check (true)', t
      );
    end if;
  end loop;
end $$;

-- 4) Confere -----------------------------------------------------------------
select 'collection_settings' as tabela, count(*) as linhas from public.collection_settings
union all
select 'collection_messages', count(*) from public.collection_messages;
