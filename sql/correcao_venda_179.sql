-- ============================================================================
-- CORREÇÃO DA VENDA #179 — devolução feita por engano induzido pelo sistema
--
-- O QUE ACONTECEU (15/10/2026)
-- O fechamento das 09:24 registrou corretamente que a cliente ficou com
--   PIJAMA INF. AMERICANO JESUS [sku 12318 · P] (x1)
--   PIJAMA AMERICANO JESUS      [sku 12257 · GG] (x1)
-- mas a tela exibia, na coluna "ficou com o cliente", o SKU e o tamanho de
-- outra peça de nome igual — efeito de um preenchimento por ordem que
-- sobrescrevia a ficha gravada no fechamento (corrigido no commit 3432013).
--
-- Vendo a peça "sumida", a operadora bipou de novo às 09:37. Essa segunda
-- devolução (returns.id = 992) baixou duas peças que estão com a cliente:
--   · R$ 119,90 + R$ 159,90 = R$ 279,80
-- e, por tabela, reescreveu o valor da venda de R$ 474,88 para R$ 398,60 —
-- sem o desconto de lucro, porque o fluxo de devolução grava o valor bruto.
--
-- O QUE ESTE SCRIPT FAZ
--   1. Devolve as duas peças para a venda (quantidade 1 em cada)
--   2. Tira do estoque as duas peças que nunca voltaram à loja
--   3. Recoloca o valor do fechamento: cobrado R$ 474,88, kit R$ 3.420,97
--   4. Apaga a devolução 992, que não deveria existir
--   5. Anota o ocorrido na observação interna da venda
--
-- Os valores conferem com o que o próprio fechamento gravou:
--   saldo antes da comissão = R$ 678,40  ·  30% de desconto  ·  cobrado 474,88
--
-- Para desfazer, use sql/restaurar_venda_179.sql.
-- ============================================================================

-- Pode ser executado mais de uma vez sem efeito cumulativo: os valores são
-- absolutos e o acerto de estoque só acontece enquanto a devolução 992 existir.

-- 1. As duas peças voltam para a venda ---------------------------------------
update public.sale_items set quantity = 1, total_price = 159.90 where id = 3792;
update public.sale_items set quantity = 1, total_price = 119.90 where id = 3794;

-- 2. Estoque: elas estão com a cliente, não na loja ---------------------------
-- Condicionado à devolução 992 ainda existir — assim rodar de novo não tira
-- peça a mais do estoque.
update public.products
   set stock_quantity = stock_quantity - 1
 where sku in (12257, 12318)
   and exists (select 1 from public.returns where id = 992);

-- 3. Valor do fechamento de volta ---------------------------------------------
update public.sales
   set final_amount = 474.88,   -- 678,40 menos os 30% de desconto de lucro
       total_amount = 3420.97   -- valor do kit que saiu da loja
 where id = 179;

-- 4. A devolução induzida sai de cena -----------------------------------------
delete from public.return_items where return_id = 992;
delete from public.returns      where id = 992;

-- 5. Fica registrado na venda --------------------------------------------------
update public.sales
   set internal_note = coalesce(internal_note || ' | ', '')
       || '15/10/2026: desfeita a devolucao das 09:37 (PIJAMA INF. AMERICANO JESUS P e '
       || 'PIJAMA AMERICANO JESUS GG). A tela mostrava o SKU de outra peca de mesmo nome '
       || 'e as pecas pareciam nao registradas. Valor recolocado em R$ 474,88.'
 where id = 179
   and coalesce(internal_note, '') not like '%desfeita a devolucao das 09:37%';
