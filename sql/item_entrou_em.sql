-- ============================================================================
-- QUANDO CADA PEÇA ENTROU NA VENDA
--
-- Até aqui não dava para saber se uma linha veio da venda original ou de uma
-- troca posterior. Isso confundiu na venda #261: a cliente devolveu um
-- CONJUNTO BARBIE P e levou OUTRO P na mesma troca, então o mesmo nome, mesmo
-- tamanho e mesmo SKU apareciam dos dois lados, parecendo contradição.
--
-- Com a data, a tela passa a dizer "entrou na troca de 20/10" e a dúvida
-- desaparece.
--
-- BACKFILL: as linhas que já existem recebem a data da própria venda. É o
-- valor conservador — não temos como saber quais delas vieram de troca, e
-- inventar uma data seria pior do que não ter. Daqui em diante o valor é real.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

alter table public.sale_items
  add column if not exists created_at timestamptz;

comment on column public.sale_items.created_at is
  'Quando a peça entrou na venda. Igual à data da venda nas linhas originais; posterior quando entrou por troca.';

-- Linhas antigas: data da venda a que pertencem.
update public.sale_items si
   set created_at = s.sale_date
  from public.sales s
 where s.id = si.sale_id
   and si.created_at is null;

-- A partir de agora o banco carimba sozinho.
alter table public.sale_items
  alter column created_at set default now();

alter table public.sale_items
  alter column created_at set not null;

create index if not exists sale_items_sale_created_idx
  on public.sale_items (sale_id, created_at);

-- Confere: nenhuma linha sem data, e quantas entraram depois da venda.
-- (sales também tem created_at, por isso tudo qualificado com si.)
select count(*) filter (where si.created_at is null)                       as sem_data,
       count(*) filter (where si.created_at > s.sale_date + interval '1 day') as entraram_depois,
       count(*)                                                            as total
  from public.sale_items si
  join public.sales s on s.id = si.sale_id;
