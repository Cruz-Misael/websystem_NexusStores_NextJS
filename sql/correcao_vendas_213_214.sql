-- ============================================================================
-- CORREÇÃO DAS VENDAS #213 e #214 — itens inseridos em duplicata pela troca
--
-- O QUE ACONTECEU
-- O botão "Confirmar Operação" da troca não travava enquanto processava. A
-- operação demora alguns segundos e não dava sinal de vida, então quem estava
-- no caixa clicou de novo — e cada clique repetiu a troca inteira, inserindo
-- outra vez os itens novos na venda.
--   #213 (11/09): 12 peças entraram 3x  -> 24 linhas a mais
--   #214 (15/09): 8 peças entraram 3x   -> 16 linhas a mais (das que ficaram)
-- A causa já está corrigida no sistema (o botão agora trava). Este script
-- conserta o que ficou gravado.
--
-- O VALOR DA VENDA JÁ ESTÁ CERTO nas duas — o que está inflado é a lista de
-- peças, que é o que a tela soma ao reabrir o consignado. Depois deste script
-- a soma das peças volta a bater com o valor cobrado:
--   #213: R$ 8.404,33 -> R$ 6.111,93 (valor gravado)
--   #214: R$ 5.171,68 -> R$ 2.933,28 (valor gravado)
--
-- COMO USAR: cole no SQL Editor do Supabase e execute UM PASSO POR VEZ,
-- conferindo o resultado de cada um. O passo 2 guarda cópia do que será
-- apagado, então dá para voltar atrás.
-- ============================================================================


-- ── PASSO 1 — CONFERÊNCIA: como estão as duas vendas agora ──────────────────
-- Esperado: "soma_das_pecas" maior que "valor_cobrado" nas duas linhas.
select
  s.id                                                as venda,
  s.payment_status                                    as situacao,
  s.final_amount                                      as valor_cobrado,
  round(sum(i.quantity * i.unit_price), 2)            as soma_das_pecas,
  round(sum(i.quantity * i.unit_price) - s.final_amount, 2) as diferenca,
  count(*) filter (where i.quantity > 0)              as linhas_ativas
from public.sales s
join public.sale_items i on i.sale_id = s.id
where s.id in (213, 214)
group by s.id, s.payment_status, s.final_amount
order by s.id;


-- ── PASSO 1B — CONFERÊNCIA: exatamente o que será apagado ───────────────────
-- São as cópias extras: de cada peça repetida fica a primeira (menor id) e
-- saem as demais. Nenhuma delas tem devolução ligada (confirmado antes de
-- escrever este script), então nada de histórico se perde.
-- Esperado: 24 linhas na #213 (R$ 2.292,40) e 16 na #214 (R$ 2.238,40).
select
  i.sale_id                                as venda,
  count(*)                                 as linhas_a_apagar,
  sum(i.quantity)                          as pecas,
  round(sum(i.quantity * i.unit_price), 2) as valor
from public.sale_items i
where i.id in (
  -- #213: 12 peças que entraram 3x — ficam os ids 4695,4696,4698,4700,4702,
  --       4704,4706,4708,4711,4714,4716,4719
  4697, 4699, 4701, 4703, 4705, 4707, 4709, 4710, 4712, 4713, 4715, 4717,
  4718, 4720, 4721, 4722, 4723, 4724, 4725, 4726, 4727, 4728, 4729, 4730,
  -- #214: 8 peças que entraram 3x — ficam os ids 4755 a 4762
  4763, 4764, 4765, 4766, 4767, 4768, 4769, 4770,
  4771, 4772, 4773, 4774, 4775, 4776, 4777, 4778
)
group by i.sale_id
order by i.sale_id;

-- Detalhe linha a linha, se quiser ver peça por peça antes de apagar:
-- select id, sale_id, product_id, product_name, quantity, unit_price
--   from public.sale_items
--  where id in ( ...a mesma lista acima... )
--  order by sale_id, id;


-- ── PASSO 2 — BACKUP do que será apagado ────────────────────────────────────
-- Guarda as linhas numa tabela à parte. Se algo sair errado, dá para devolver.
-- Cria a tabela já com as linhas dentro — sem herdar identity/default da
-- original, que impediria gravar os ids como estão.
create table if not exists public.backup_sale_items_troca_duplicada as
select
  i.*,
  now() as backup_em,
  'troca duplicada por clique repetido - vendas 213/214' as motivo
from public.sale_items i
where i.id in (
  4697, 4699, 4701, 4703, 4705, 4707, 4709, 4710, 4712, 4713, 4715, 4717,
  4718, 4720, 4721, 4722, 4723, 4724, 4725, 4726, 4727, 4728, 4729, 4730,
  4763, 4764, 4765, 4766, 4767, 4768, 4769, 4770,
  4771, 4772, 4773, 4774, 4775, 4776, 4777, 4778
);

-- Confere o backup: deve dizer 40 linhas.
select count(*) as linhas_no_backup from public.backup_sale_items_troca_duplicada;


-- ── PASSO 3 — APAGA as cópias extras ────────────────────────────────────────
-- Só rode depois de o passo 2 acusar as 40 linhas guardadas.
delete from public.sale_items
where id in (
  4697, 4699, 4701, 4703, 4705, 4707, 4709, 4710, 4712, 4713, 4715, 4717,
  4718, 4720, 4721, 4722, 4723, 4724, 4725, 4726, 4727, 4728, 4729, 4730,
  4763, 4764, 4765, 4766, 4767, 4768, 4769, 4770,
  4771, 4772, 4773, 4774, 4775, 4776, 4777, 4778
);


-- ── PASSO 4 — CONFERÊNCIA FINAL ─────────────────────────────────────────────
-- Agora "diferenca" tem que ser 0,00 nas duas vendas.
select
  s.id                                                      as venda,
  s.final_amount                                            as valor_cobrado,
  round(sum(i.quantity * i.unit_price), 2)                  as soma_das_pecas,
  round(sum(i.quantity * i.unit_price) - s.final_amount, 2) as diferenca,
  case when round(sum(i.quantity * i.unit_price) - s.final_amount, 2) = 0
       then 'OK - bate com o valor cobrado'
       else 'AINDA DIVERGENTE - nao prossiga, me chame'
  end                                                       as situacao
from public.sales s
join public.sale_items i on i.sale_id = s.id
where s.id in (213, 214)
group by s.id, s.final_amount
order by s.id;


-- ── PASSO 5 (OPCIONAL) — deixar registrado na venda o que foi corrigido ─────
update public.sales
   set internal_note = coalesce(internal_note || ' | ', '')
       || 'Itens duplicados pela troca removidos em ' || to_char(now(), 'DD/MM/YYYY')
 where id in (213, 214);


-- ============================================================================
-- ESTOQUE — leia antes de mexer
--
-- Este script NÃO ajusta estoque, de propósito.
--
-- O mesmo clique repetido também mexeu no estoque, nos dois sentidos: creditou
-- peças a mais (cada devolução repetida) e debitou peças a mais (cada inserção
-- repetida). O saldo teórico dessas duas vendas é de cerca de +68 peças a mais
-- na #214 e algo parecido na #213 — mas é só teórico: o sistema lê o estoque e
-- grava a soma de volta, sem incremento atômico, então créditos que aconteceram
-- ao mesmo tempo se sobrescreveram e se perderam. Não há como saber o número
-- real pelos registros, e não existe kardex de venda/devolução para reconstruir
-- (a tabela stock_movements só tem 20 entradas de compra, de julho).
--
-- Aplicar meio ajuste deixaria o estoque pior do que está. O caminho correto é
-- INVENTÁRIO FÍSICO para zerar a contagem — agora que a causa está travada, o
-- número volta a valer daí em diante.
-- ============================================================================
