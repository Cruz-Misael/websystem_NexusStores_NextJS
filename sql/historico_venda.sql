-- ============================================================================
-- HISTÓRICO DA VENDA (trocas, devoluções, fechamento e reabertura de consignado)
--
-- Até aqui o que acontecia com uma venda depois de fechada ficava espalhado:
-- a devolução em returns, o fechamento do consignado empurrado como TEXTO no
-- fim da observação (aquele bloco "[FECHADO EM ...] Saldo: ... | Cobrado: ...")
-- e os itens que ENTRARAM numa troca não ficavam registrados em lugar nenhum.
-- Sem esse rastro, o episódio do clique repetido nas vendas #213 e #214 só foi
-- reconstituído garimpando ids na mão.
--
-- Esta tabela passa a guardar cada acontecimento da venda numa linha, com o
-- resumo pronto para a tela e o detalhe em JSON para auditoria.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

create table if not exists public.sale_events (
  id         bigserial primary key,
  sale_id    bigint not null references public.sales(id) on delete cascade,
  type       text   not null check (type in (
               'troca', 'devolucao', 'fechamento_consignado',
               'reabertura_consignado', 'pagamento', 'cancelamento', 'ajuste')),
  -- Frase pronta, do jeito que aparece na tela ("Troca: saíram 3 peças, entraram 2")
  summary    text   not null,
  -- Detalhe estruturado: { saiu: [{nome, qtd, valor}], entrou: [...],
  --                        saldo, comissao_percent, comissao_valor, cobrado,
  --                        return_id }
  details    jsonb  not null default '{}'::jsonb,
  valor_antes numeric,
  valor_depois numeric,
  created_by uuid,
  created_at timestamptz not null default now()
);

comment on table public.sale_events is
  'Linha do tempo de cada venda: troca, devolução, fechamento e reabertura de consignado. Alimenta o botão Histórico na tela de vendas.';

create index if not exists sale_events_sale_idx on public.sale_events (sale_id, created_at desc);

-- RLS no mesmo padrão das demais tabelas ------------------------------------
do $$
begin
  alter table public.sale_events enable row level security;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'sale_events' and policyname = 'authenticated_all'
  ) then
    create policy authenticated_all on public.sale_events
      for all to authenticated using (true) with check (true);
  end if;
end $$;

select count(*) as eventos_registrados from public.sale_events;
