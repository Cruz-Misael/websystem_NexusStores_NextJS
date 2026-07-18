-- ============================================================================
-- BACKFILL: settled_at dos consignados JÁ fechados
--
-- Preenche sales.settled_at (data do acerto) dos consignados que foram fechados
-- ANTES da coluna existir, lendo o marcador "[FECHADO EM DD/MM/AAAA]" que já
-- ficava gravado na observação. Assim os relatórios passam a considerar a data
-- do acerto também no histórico, e não a data da venda.
--
-- PRÉ-REQUISITO: rode antes o sql/melhorias_nota_consignado_obs.sql (cria settled_at).
-- COMO USAR: cole no SQL Editor do Supabase e execute. Idempotente (só toca
--            registros com settled_at ainda nulo).
-- ============================================================================

update public.sales
   set settled_at = to_timestamp(
         substring(observation from 'FECHADO EM (\d{2}/\d{2}/\d{4})'),
         'DD/MM/YYYY'
       )
 where settled_at is null
   and payment_status = 'paid'
   and observation ~ 'FECHADO EM \d{2}/\d{2}/\d{4}';
