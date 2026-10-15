-- ============================================================================
-- DESFAZER a correção da venda #179
--
-- Devolve tudo ao estado de antes de sql/correcao_venda_179.sql: as duas peças
-- voltam a zero na venda, o estoque recebe as duas de volta, o valor volta aos
-- R$ 398,60 e a devolução 992 é recriada com os ids originais.
--
-- Só rode se o conserto tiver sido um engano — por exemplo, se a Franciele
-- confirmar que aquelas duas peças voltaram mesmo para a loja.
-- ============================================================================

update public.sale_items set quantity = 0, total_price = 0 where id = 3792;
update public.sale_items set quantity = 0, total_price = 0 where id = 3794;

update public.products set stock_quantity = stock_quantity + 1 where sku = 12257;
update public.products set stock_quantity = stock_quantity + 1 where sku = 12318;

update public.sales set final_amount = 398.60, total_amount = 398.60 where id = 179;

insert into public.returns (id, sale_id, motive, type, status, created_at)
values (992, 179, 'Ajuste manual de troca/devolução', 'devolucao', 'completed',
        '2026-10-15T12:37:47Z')
on conflict (id) do nothing;

insert into public.return_items
  (id, return_id, sale_item_id, product_id, quantity, unit_price, total_price)
values
  (25802, 992, 3792, 12257, 1, 159.90, 159.90),
  (25803, 992, 3794, 12318, 1, 119.90, 119.90)
on conflict (id) do nothing;

select id, total_amount, final_amount from public.sales where id = 179;
