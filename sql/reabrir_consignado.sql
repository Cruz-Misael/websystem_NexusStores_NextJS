-- ============================================================================
-- REABERTURA DE CONSIGNADO FECHADO
--
-- Cria a função reabrir_consignado(sale_id, motivo), que desfaz o FECHAMENTO
-- de um consignado e devolve a venda para o estado PENDENTE:
--
--   * payment_status                    -> 'pending'
--   * settled_at                        -> NULL (sai da data de acerto)
--   * final_amount                      -> saldo devido antes da comissão
--   * consignado_commission_percent     -> NULL
--   * consignado_net_before_commission  -> NULL
--   * observation                       -> ganha a linha [REABERTO EM ...]
--
-- O QUE ELA NÃO FAZ (de propósito): não mexe em estoque, não apaga devoluções
-- e não altera os itens da venda. As peças devolvidas no fechamento continuam
-- devolvidas e no estoque — o que volta é apenas a cobrança do consignado.
-- Para desfazer também a devolução, é preciso estornar a devolução à parte.
--
-- SEGURANÇA: só administradores (authorized_users.role = 'admin', status
-- 'ativo') conseguem executar. A regra fica no servidor, não no front.
-- Tudo roda numa única transação: ou a reabertura inteira acontece, ou nada.
--
-- COMO USAR: cole no SQL Editor do Supabase e execute (idempotente).
-- ============================================================================

create or replace function public.reabrir_consignado(
  p_sale_id bigint,
  p_motivo  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role   text;
  v_sale   record;
  v_saldo  numeric;
  v_motivo text := nullif(btrim(p_motivo), '');
begin
  -- 1) Somente administrador reabre ------------------------------------------
  select au.role
    into v_role
    from public.authorized_users au
   where au.user_id = auth.uid()
     and au.status = 'ativo'
   limit 1;

  if v_role is distinct from 'admin' then
    raise exception 'Apenas administradores podem reabrir um consignado fechado';
  end if;

  -- 2) Carrega a venda e valida o estado -------------------------------------
  select s.id,
         s.payment_status,
         s.payment_method,
         s.observation,
         s.final_amount,
         s.consignado_net_before_commission
    into v_sale
    from public.sales s
   where s.id = p_sale_id
     for update;

  if not found then
    raise exception 'Venda #% não encontrada', p_sale_id;
  end if;

  if v_sale.payment_status <> 'paid' then
    raise exception 'A venda #% não está concluída (status atual: %). Só há o que reabrir num consignado fechado.',
      p_sale_id, v_sale.payment_status;
  end if;

  if v_sale.payment_method is distinct from 'consignado'
     and coalesce(v_sale.observation, '') not like '%Venda consignada%' then
    raise exception 'A venda #% não é um consignado', p_sale_id;
  end if;

  -- 3) Saldo a restaurar: o valor devido ANTES da comissão do fechamento.
  --    Consignados fechados antes dessas colunas existirem não têm o saldo
  --    gravado; nesse caso volta o valor que foi efetivamente cobrado.
  v_saldo := coalesce(v_sale.consignado_net_before_commission, v_sale.final_amount, 0);

  -- 4) Reabre -----------------------------------------------------------------
  update public.sales
     set payment_status                   = 'pending',
         settled_at                       = null,
         final_amount                     = v_saldo,
         consignado_commission_percent    = null,
         consignado_net_before_commission = null,
         observation = concat_ws(
           E'\n',
           nullif(btrim(coalesce(observation, '')), ''),
           format(
             '[REABERTO EM %s] Fechamento desfeito: volta a pendente com saldo de R$ %s. Devoluções e estoque não foram alterados.%s',
             to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'),
             replace(to_char(v_saldo, 'FM999999990.00'), '.', ','),
             case when v_motivo is null then '' else ' Motivo: ' || v_motivo end
           )
         )
   where id = p_sale_id;

  return jsonb_build_object(
    'sale_id',          p_sale_id,
    'saldo_restaurado', v_saldo,
    'reaberto_em',      now()
  );
end $$;

comment on function public.reabrir_consignado(bigint, text) is
  'Desfaz o fechamento de um consignado: status volta a pending, limpa settled_at '
  'e comissão, restaura o saldo devido e registra [REABERTO EM ...] na observação. '
  'Não altera estoque, devoluções nem itens da venda. Restrita a role = admin.';

-- Permite chamar via RPC pelo usuário autenticado (a checagem de admin é interna)
grant execute on function public.reabrir_consignado(bigint, text) to authenticated;
