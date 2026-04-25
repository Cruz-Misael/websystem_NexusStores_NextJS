-- Função para decrementar o estoque de um produto
-- Execute este SQL no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION decrement_stock(product_sku_param BIGINT, quantity_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - quantity_param
    WHERE sku = product_sku_param;

    -- Verificar se o estoque ficou negativo (opcional)
    IF (SELECT stock_quantity FROM products WHERE sku = product_sku_param) < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto SKU: %', product_sku_param;
    END IF;
END;
$$ LANGUAGE plpgsql;