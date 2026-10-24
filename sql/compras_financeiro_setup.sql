-- ============================================================================
-- NEXUS STORE — MÓDULOS DE COMPRAS & FINANCEIRO
-- Setup completo do banco (Supabase / Postgres)
--
-- COMO USAR: cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- O script é IDEMPOTENTE: pode ser executado mais de uma vez sem duplicar
-- tabelas, colunas, políticas ou dados de seed.
--
-- Organização (espelha o plano de implementação):
--   FASE 00 — Fornecedores
--   FASE 01 — Kardex de estoque (stock_movements)
--   FASE 02 — Pedidos de Compra
--   FASE 03 — Recebimento de Mercadoria
--   FASE 04 — Financeiro base (contas, categorias, contas a pagar)
--   FASE 05 — RPCs transacionais (recebimento → estoque + contas a pagar)
--   FASE 06 — Caixa com sessão (tabelas + RPCs; UI virá depois)
--   FINAL   — RLS, grants e seeds
-- ============================================================================


-- ============================================================================
-- FASE 00 — FORNECEDORES
-- ============================================================================

create table if not exists public.suppliers (
  id                    bigint generated always as identity primary key,
  name                  text not null,
  legal_name            text,
  document              text,                          -- CNPJ / CPF
  email                 text,
  phone                 text,
  contact_name          text,
  address               jsonb,                         -- { logradouro, cidade, uf, cep }
  default_payment_terms text,                          -- ex.: "30/60/90", "à vista"
  lead_time_days        int,
  bank_info             jsonb,                         -- dados bancários / chave PIX
  notes                 text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create index if not exists idx_suppliers_name on public.suppliers (name);

-- Vínculo do produto com o fornecedor (aditivo — o campo texto `supplier` continua)
alter table public.products add column if not exists supplier_id bigint references public.suppliers(id);


-- ============================================================================
-- FASE 01 — KARDEX DE ESTOQUE
-- Toda entrada/saída de estoque passa a ter histórico auditável.
-- products.stock_quantity vira um "cache" mantido pelas RPCs.
-- ============================================================================

create table if not exists public.stock_movements (
  id             bigint generated always as identity primary key,
  product_sku    bigint not null references public.products(sku),
  type           text not null check (type in (
                   'purchase_in','sale_out','return_in',
                   'adjustment_in','adjustment_out','loss','transfer')),
  quantity       numeric(12,3) not null,               -- positivo = entrada, negativo = saída
  unit_cost      numeric(12,2),
  balance_after  numeric(12,3),
  reference_type text,                                 -- goods_receipt | sale | return | manual
  reference_id   bigint,
  reason         text,
  created_by     uuid,
  created_at     timestamptz not null default now()
);

create index if not exists idx_stock_movements_product on public.stock_movements (product_sku, created_at desc);
create index if not exists idx_stock_movements_ref     on public.stock_movements (reference_type, reference_id);

-- RPC genérica de movimentação (usada para ajustes manuais e integrações futuras)
create or replace function public.registrar_movimento_estoque(
  p_product_sku    bigint,
  p_type           text,
  p_quantity       numeric,          -- positivo entra, negativo sai
  p_unit_cost      numeric default null,
  p_reference_type text default 'manual',
  p_reference_id   bigint default null,
  p_reason         text default null
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock numeric;
begin
  select coalesce(stock_quantity, 0) into v_stock
  from products where sku = p_product_sku for update;

  if not found then
    raise exception 'Produto SKU % não encontrado', p_product_sku;
  end if;

  v_stock := v_stock + p_quantity;

  update products set stock_quantity = v_stock where sku = p_product_sku;

  insert into stock_movements
    (product_sku, type, quantity, unit_cost, balance_after,
     reference_type, reference_id, reason, created_by)
  values
    (p_product_sku, p_type, p_quantity, p_unit_cost, v_stock,
     p_reference_type, p_reference_id, p_reason, auth.uid());

  return v_stock;
end $$;


-- ============================================================================
-- FASE 02 — PEDIDOS DE COMPRA
-- ============================================================================

create sequence if not exists public.purchase_order_code_seq;

create table if not exists public.purchase_orders (
  id             bigint generated always as identity primary key,
  code           text not null unique
                   default ('PC-' || to_char(now(), 'YYYY') || '-' ||
                            lpad(nextval('public.purchase_order_code_seq')::text, 4, '0')),
  supplier_id    bigint not null references public.suppliers(id),
  status         text not null default 'draft' check (status in (
                   'draft','pending_approval','approved','sent',
                   'partially_received','received','cancelled')),
  expected_date  date,
  items_total    numeric(12,2) not null default 0,
  freight        numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  other_costs    numeric(12,2) not null default 0,
  total_amount   numeric(12,2) not null default 0,
  payment_terms  text,
  notes          text,
  created_by     uuid,
  approved_by    uuid,
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_purchase_orders_status   on public.purchase_orders (status);
create index if not exists idx_purchase_orders_supplier on public.purchase_orders (supplier_id);

create table if not exists public.purchase_order_items (
  id                 bigint generated always as identity primary key,
  purchase_order_id  bigint not null references public.purchase_orders(id) on delete cascade,
  product_sku        bigint references public.products(sku),
  description        text,                             -- fallback p/ produto ainda não cadastrado
  quantity_ordered   numeric(12,3) not null check (quantity_ordered > 0),
  quantity_received  numeric(12,3) not null default 0,
  unit_cost          numeric(12,2) not null default 0,
  total_cost         numeric(12,2) not null default 0
);

create index if not exists idx_po_items_po on public.purchase_order_items (purchase_order_id);


-- ============================================================================
-- FASE 03 — RECEBIMENTO DE MERCADORIA
-- ============================================================================

create sequence if not exists public.goods_receipt_code_seq;

create table if not exists public.goods_receipts (
  id                 bigint generated always as identity primary key,
  code               text not null unique
                       default ('RC-' || to_char(now(), 'YYYY') || '-' ||
                                lpad(nextval('public.goods_receipt_code_seq')::text, 4, '0')),
  purchase_order_id  bigint references public.purchase_orders(id),   -- nulo = recebimento avulso
  supplier_id        bigint not null references public.suppliers(id),
  receipt_date       timestamptz not null default now(),
  invoice_number     text,
  invoice_key        text,
  freight            numeric(12,2) not null default 0,
  other_costs        numeric(12,2) not null default 0,
  total_amount       numeric(12,2) not null default 0,
  status             text not null default 'draft' check (status in ('draft','confirmed','cancelled')),
  notes              text,
  received_by        uuid,
  created_at         timestamptz not null default now()
);

create index if not exists idx_goods_receipts_po       on public.goods_receipts (purchase_order_id);
create index if not exists idx_goods_receipts_supplier on public.goods_receipts (supplier_id);

create table if not exists public.goods_receipt_items (
  id                      bigint generated always as identity primary key,
  goods_receipt_id        bigint not null references public.goods_receipts(id) on delete cascade,
  purchase_order_item_id  bigint references public.purchase_order_items(id),
  product_sku             bigint references public.products(sku),
  quantity                numeric(12,3) not null check (quantity > 0),
  unit_cost               numeric(12,2) not null default 0,
  total_cost              numeric(12,2) not null default 0
);

create index if not exists idx_gr_items_receipt on public.goods_receipt_items (goods_receipt_id);


-- ============================================================================
-- FASE 04 — FINANCEIRO BASE
-- ============================================================================

create table if not exists public.financial_accounts (
  id               bigint generated always as identity primary key,
  name             text not null,
  type             text not null default 'bank' check (type in ('cash','bank','wallet')),
  opening_balance  numeric(12,2) not null default 0,
  current_balance  numeric(12,2) not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.financial_categories (
  id         bigint generated always as identity primary key,
  name       text not null,
  type       text not null check (type in ('income','expense')),
  parent_id  bigint references public.financial_categories(id),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence if not exists public.payable_code_seq;

create table if not exists public.payables (
  id                 bigint generated always as identity primary key,
  code               text not null unique
                       default ('CP-' || to_char(now(), 'YYYY') || '-' ||
                                lpad(nextval('public.payable_code_seq')::text, 4, '0')),
  supplier_id        bigint references public.suppliers(id),
  description        text not null,
  category_id        bigint references public.financial_categories(id),
  origin             text not null default 'manual' check (origin in ('purchase','manual','expense')),
  goods_receipt_id   bigint unique references public.goods_receipts(id),  -- UNIQUE = idempotência
  purchase_order_id  bigint references public.purchase_orders(id),
  total_amount       numeric(12,2) not null,
  issue_date         date not null default current_date,
  status             text not null default 'open' check (status in (
                       'open','partially_paid','paid','cancelled')),
  notes              text,
  created_by         uuid,
  created_at         timestamptz not null default now()
);

create index if not exists idx_payables_status   on public.payables (status);
create index if not exists idx_payables_supplier on public.payables (supplier_id);

create table if not exists public.payable_installments (
  id                  bigint generated always as identity primary key,
  payable_id          bigint not null references public.payables(id) on delete cascade,
  installment_number  int not null,
  due_date            date not null,
  amount              numeric(12,2) not null,
  paid_amount         numeric(12,2) not null default 0,
  status              text not null default 'open' check (status in (
                        'open','partially_paid','paid','cancelled')),
  created_at          timestamptz not null default now()
);

create index if not exists idx_installments_payable on public.payable_installments (payable_id);
create index if not exists idx_installments_due     on public.payable_installments (due_date) where status in ('open','partially_paid');

create table if not exists public.financial_transactions (
  id               bigint generated always as identity primary key,
  account_id       bigint not null references public.financial_accounts(id),
  direction        text not null check (direction in ('in','out')),
  amount           numeric(12,2) not null check (amount > 0),
  interest_amount  numeric(12,2) not null default 0,   -- juros/multa embutidos no valor pago
  discount_amount  numeric(12,2) not null default 0,   -- desconto obtido na baixa
  category_id      bigint references public.financial_categories(id),
  payment_method   text,
  reference_type   text,                               -- payable_installment | sale | manual | transfer
  reference_id     bigint,
  reversed_of      bigint references public.financial_transactions(id),  -- estorno aponta p/ original
  transaction_date date not null default current_date,
  notes            text,
  reconciled       boolean not null default false,     -- p/ conciliação bancária futura
  created_by       uuid,
  created_at       timestamptz not null default now()
);

create index if not exists idx_fin_tx_account on public.financial_transactions (account_id, transaction_date desc);
create index if not exists idx_fin_tx_ref     on public.financial_transactions (reference_type, reference_id);


-- ============================================================================
-- FASE 05 — RPCs TRANSACIONAIS
-- Operações compostas rodam inteiras dentro de uma transação: se qualquer
-- passo falhar, tudo é revertido.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1  CONFIRMAR RECEBIMENTO
--      estoque (+kardex) + custo médio + status do pedido + conta a pagar
--      p_parcelas: '[{"due_date":"2026-08-03","amount":500.00}, ...]'
--                  (null → 1 parcela à vista, vencendo hoje)
-- ----------------------------------------------------------------------------
create or replace function public.confirmar_recebimento(
  p_receipt_id  bigint,
  p_parcelas    jsonb  default null,
  p_category_id bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt      goods_receipts%rowtype;
  v_item         goods_receipt_items%rowtype;
  v_stock        numeric;
  v_cost         numeric;
  v_new_stock    numeric;
  v_new_cost     numeric;
  v_total        numeric;
  v_payable_id   bigint;
  v_category_id  bigint;
  v_parcela      jsonb;
  v_i            int := 0;
  v_sum          numeric := 0;
  v_all_received boolean;
begin
  select * into v_receipt from goods_receipts where id = p_receipt_id for update;
  if not found then
    raise exception 'Recebimento % não encontrado', p_receipt_id;
  end if;
  if v_receipt.status <> 'draft' then
    raise exception 'Recebimento % já está com status "%"', v_receipt.code, v_receipt.status;
  end if;

  -- Total = itens + frete + outros custos
  select coalesce(sum(total_cost), 0) into v_total
  from goods_receipt_items where goods_receipt_id = p_receipt_id;
  v_total := v_total + coalesce(v_receipt.freight, 0) + coalesce(v_receipt.other_costs, 0);

  if v_total <= 0 then
    raise exception 'Recebimento sem itens ou com total zerado';
  end if;

  -- Entrada de estoque item a item + custo médio ponderado
  for v_item in
    select * from goods_receipt_items where goods_receipt_id = p_receipt_id
  loop
    if v_item.product_sku is not null then
      select coalesce(stock_quantity, 0), coalesce(cost, 0)
        into v_stock, v_cost
        from products where sku = v_item.product_sku for update;
      if not found then
        raise exception 'Produto SKU % não encontrado', v_item.product_sku;
      end if;

      v_new_stock := v_stock + v_item.quantity;
      if v_stock > 0 then
        v_new_cost := round(((v_stock * v_cost) + (v_item.quantity * coalesce(v_item.unit_cost, 0)))
                            / v_new_stock, 2);
      else
        v_new_cost := coalesce(nullif(v_item.unit_cost, 0), v_cost);
      end if;

      update products
        set stock_quantity = v_new_stock, cost = v_new_cost
        where sku = v_item.product_sku;

      insert into stock_movements
        (product_sku, type, quantity, unit_cost, balance_after,
         reference_type, reference_id, created_by)
      values
        (v_item.product_sku, 'purchase_in', v_item.quantity, v_item.unit_cost, v_new_stock,
         'goods_receipt', p_receipt_id, auth.uid());
    end if;

    -- Acumula o recebido no item do pedido
    if v_item.purchase_order_item_id is not null then
      update purchase_order_items
        set quantity_received = coalesce(quantity_received, 0) + v_item.quantity
        where id = v_item.purchase_order_item_id;
    end if;
  end loop;

  -- Atualiza status do pedido (parcial ou total)
  if v_receipt.purchase_order_id is not null then
    select bool_and(coalesce(quantity_received, 0) >= quantity_ordered)
      into v_all_received
      from purchase_order_items
      where purchase_order_id = v_receipt.purchase_order_id;

    update purchase_orders
      set status = case when coalesce(v_all_received, false) then 'received' else 'partially_received' end,
          updated_at = now()
      where id = v_receipt.purchase_order_id;
  end if;

  update goods_receipts
    set status = 'confirmed', total_amount = v_total
    where id = p_receipt_id;

  -- Categoria padrão para compras
  if p_category_id is not null then
    v_category_id := p_category_id;
  else
    select id into v_category_id
    from financial_categories
    where name = 'Compra de Mercadoria' and type = 'expense'
    limit 1;
  end if;

  -- Conta a pagar (o UNIQUE em goods_receipt_id garante idempotência)
  insert into payables
    (supplier_id, description, category_id, origin, goods_receipt_id,
     purchase_order_id, total_amount, issue_date, status, created_by)
  values
    (v_receipt.supplier_id,
     'Compra de mercadoria — ' || v_receipt.code
       || coalesce(' · NF ' || nullif(v_receipt.invoice_number, ''), ''),
     v_category_id, 'purchase', p_receipt_id,
     v_receipt.purchase_order_id, v_total, current_date, 'open', auth.uid())
  returning id into v_payable_id;

  -- Parcelas
  if p_parcelas is null or jsonb_array_length(p_parcelas) = 0 then
    insert into payable_installments (payable_id, installment_number, due_date, amount)
    values (v_payable_id, 1, current_date, v_total);
  else
    for v_parcela in select value from jsonb_array_elements(p_parcelas)
    loop
      v_i := v_i + 1;
      v_sum := v_sum + (v_parcela->>'amount')::numeric;
      insert into payable_installments (payable_id, installment_number, due_date, amount)
      values (v_payable_id, v_i, (v_parcela->>'due_date')::date, (v_parcela->>'amount')::numeric);
    end loop;

    if round(v_sum, 2) <> round(v_total, 2) then
      raise exception 'Soma das parcelas (R$ %) difere do total do recebimento (R$ %)', v_sum, v_total;
    end if;
  end if;

  return jsonb_build_object(
    'receipt_id', p_receipt_id,
    'payable_id', v_payable_id,
    'total', v_total
  );
end $$;

-- ----------------------------------------------------------------------------
-- 5.2  ESTORNAR RECEBIMENTO
--      Reverte estoque, saldo do pedido e cancela a conta a pagar.
--      Bloqueado se qualquer parcela já tiver pagamento.
-- ----------------------------------------------------------------------------
create or replace function public.estornar_recebimento(p_receipt_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt   goods_receipts%rowtype;
  v_item      goods_receipt_items%rowtype;
  v_payable   payables%rowtype;
  v_has_paid  boolean;
  v_new_stock numeric;
  v_any_received boolean;
begin
  select * into v_receipt from goods_receipts where id = p_receipt_id for update;
  if not found then
    raise exception 'Recebimento % não encontrado', p_receipt_id;
  end if;
  if v_receipt.status <> 'confirmed' then
    raise exception 'Só é possível estornar recebimentos confirmados (status atual: %)', v_receipt.status;
  end if;

  -- Bloqueia se a conta a pagar tiver qualquer baixa
  select * into v_payable from payables where goods_receipt_id = p_receipt_id;
  if found then
    select coalesce(bool_or(paid_amount > 0), false) into v_has_paid
    from payable_installments where payable_id = v_payable.id;
    if v_has_paid then
      raise exception 'A conta a pagar % já possui pagamentos. Estorne as baixas financeiras antes.', v_payable.code;
    end if;
  end if;

  -- Reverte o estoque
  for v_item in
    select * from goods_receipt_items where goods_receipt_id = p_receipt_id
  loop
    if v_item.product_sku is not null then
      update products
        set stock_quantity = coalesce(stock_quantity, 0) - v_item.quantity
        where sku = v_item.product_sku
        returning stock_quantity into v_new_stock;

      insert into stock_movements
        (product_sku, type, quantity, unit_cost, balance_after,
         reference_type, reference_id, reason, created_by)
      values
        (v_item.product_sku, 'adjustment_out', -v_item.quantity, v_item.unit_cost, v_new_stock,
         'goods_receipt', p_receipt_id, 'Estorno do recebimento ' || v_receipt.code, auth.uid());
    end if;

    if v_item.purchase_order_item_id is not null then
      update purchase_order_items
        set quantity_received = greatest(coalesce(quantity_received, 0) - v_item.quantity, 0)
        where id = v_item.purchase_order_item_id;
    end if;
  end loop;

  -- Recalcula status do pedido
  if v_receipt.purchase_order_id is not null then
    select coalesce(bool_or(quantity_received > 0), false) into v_any_received
    from purchase_order_items where purchase_order_id = v_receipt.purchase_order_id;

    update purchase_orders
      set status = case when v_any_received then 'partially_received' else 'sent' end,
          updated_at = now()
      where id = v_receipt.purchase_order_id;
  end if;

  -- Cancela a conta a pagar e parcelas
  if v_payable.id is not null then
    update payable_installments set status = 'cancelled' where payable_id = v_payable.id;
    update payables set status = 'cancelled' where id = v_payable.id;
  end if;

  update goods_receipts set status = 'cancelled' where id = p_receipt_id;

  return jsonb_build_object('receipt_id', p_receipt_id, 'status', 'cancelled');
end $$;

-- ----------------------------------------------------------------------------
-- 5.3  CRIAR CONTA A PAGAR MANUAL (despesas: aluguel, energia, salários...)
--      p_parcelas: '[{"due_date":"2026-08-01","amount":1200.00}, ...]'
-- ----------------------------------------------------------------------------
create or replace function public.criar_conta_pagar_manual(
  p_description text,
  p_total       numeric,
  p_parcelas    jsonb,
  p_category_id bigint default null,
  p_supplier_id bigint default null,
  p_issue_date  date   default current_date,
  p_notes       text   default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payable_id bigint;
  v_parcela    jsonb;
  v_i          int := 0;
  v_sum        numeric := 0;
begin
  if p_total is null or p_total <= 0 then
    raise exception 'Valor total deve ser maior que zero';
  end if;
  if p_parcelas is null or jsonb_array_length(p_parcelas) = 0 then
    raise exception 'Informe ao menos uma parcela';
  end if;

  insert into payables
    (supplier_id, description, category_id, origin, total_amount, issue_date, notes, created_by)
  values
    (p_supplier_id, p_description, p_category_id, 'manual', p_total, p_issue_date, p_notes, auth.uid())
  returning id into v_payable_id;

  for v_parcela in select value from jsonb_array_elements(p_parcelas)
  loop
    v_i := v_i + 1;
    v_sum := v_sum + (v_parcela->>'amount')::numeric;
    insert into payable_installments (payable_id, installment_number, due_date, amount)
    values (v_payable_id, v_i, (v_parcela->>'due_date')::date, (v_parcela->>'amount')::numeric);
  end loop;

  if round(v_sum, 2) <> round(p_total, 2) then
    raise exception 'Soma das parcelas (R$ %) difere do total (R$ %)', v_sum, p_total;
  end if;

  return v_payable_id;
end $$;

-- ----------------------------------------------------------------------------
-- 5.4  BAIXAR PARCELA (pagamento total ou parcial)
--      p_amount = valor que sai da conta (já com juros e descontos aplicados)
--      Quitação da parcela = p_amount - p_juros + p_desconto
-- ----------------------------------------------------------------------------
create or replace function public.baixar_parcela(
  p_installment_id bigint,
  p_account_id     bigint,
  p_amount         numeric,
  p_juros          numeric default 0,
  p_desconto       numeric default 0,
  p_payment_method text    default null,
  p_date           date    default current_date,
  p_notes          text    default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst     payable_installments%rowtype;
  v_payable  payables%rowtype;
  v_settled  numeric;
  v_new_paid numeric;
  v_tx_id    bigint;
  v_all_paid boolean;
  v_any_paid boolean;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor do pagamento deve ser maior que zero';
  end if;

  select * into v_inst from payable_installments where id = p_installment_id for update;
  if not found then
    raise exception 'Parcela % não encontrada', p_installment_id;
  end if;
  if v_inst.status in ('paid', 'cancelled') then
    raise exception 'Parcela já está com status "%"', v_inst.status;
  end if;

  select * into v_payable from payables where id = v_inst.payable_id for update;

  -- Quanto da parcela é quitado por esse pagamento
  v_settled  := p_amount - coalesce(p_juros, 0) + coalesce(p_desconto, 0);
  v_new_paid := v_inst.paid_amount + v_settled;

  if v_new_paid > v_inst.amount + 0.01 then
    raise exception 'Pagamento quita R$ % mas a parcela só tem R$ % em aberto',
      v_settled, (v_inst.amount - v_inst.paid_amount);
  end if;

  -- Lança a transação financeira (saída)
  insert into financial_transactions
    (account_id, direction, amount, interest_amount, discount_amount, category_id,
     payment_method, reference_type, reference_id, transaction_date, notes, created_by)
  values
    (p_account_id, 'out', p_amount, coalesce(p_juros, 0), coalesce(p_desconto, 0),
     v_payable.category_id, p_payment_method, 'payable_installment', p_installment_id,
     p_date, p_notes, auth.uid())
  returning id into v_tx_id;

  -- Atualiza a parcela
  update payable_installments
    set paid_amount = v_new_paid,
        status = case when v_new_paid >= amount - 0.01 then 'paid' else 'partially_paid' end
    where id = p_installment_id;

  -- Atualiza a conta a pagar
  select bool_and(status = 'paid'), bool_or(paid_amount > 0)
    into v_all_paid, v_any_paid
    from payable_installments
    where payable_id = v_payable.id and status <> 'cancelled';

  update payables
    set status = case
      when coalesce(v_all_paid, false) then 'paid'
      when coalesce(v_any_paid, false) then 'partially_paid'
      else 'open' end
    where id = v_payable.id;

  -- Debita o saldo da conta
  update financial_accounts
    set current_balance = current_balance - p_amount
    where id = p_account_id;

  return jsonb_build_object('transaction_id', v_tx_id, 'installment_id', p_installment_id);
end $$;

-- ----------------------------------------------------------------------------
-- 5.5  ESTORNAR BAIXA
--      Cria a transação inversa, devolve o saldo e reabre a parcela.
-- ----------------------------------------------------------------------------
create or replace function public.estornar_baixa(p_transaction_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx       financial_transactions%rowtype;
  v_inst     payable_installments%rowtype;
  v_settled  numeric;
  v_new_paid numeric;
  v_rev_id   bigint;
  v_all_paid boolean;
  v_any_paid boolean;
begin
  select * into v_tx from financial_transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'Transação % não encontrada', p_transaction_id;
  end if;
  if v_tx.reference_type <> 'payable_installment' then
    raise exception 'Só é possível estornar baixas de parcelas por esta função';
  end if;
  if v_tx.reversed_of is not null then
    raise exception 'Esta transação já é um estorno';
  end if;
  if exists (select 1 from financial_transactions where reversed_of = p_transaction_id) then
    raise exception 'Esta transação já foi estornada';
  end if;

  select * into v_inst from payable_installments where id = v_tx.reference_id for update;

  -- Transação inversa (entrada devolvendo o valor)
  insert into financial_transactions
    (account_id, direction, amount, category_id, payment_method,
     reference_type, reference_id, reversed_of, transaction_date, notes, created_by)
  values
    (v_tx.account_id, 'in', v_tx.amount, v_tx.category_id, v_tx.payment_method,
     'payable_installment', v_tx.reference_id, p_transaction_id, current_date,
     'Estorno da baixa #' || p_transaction_id, auth.uid())
  returning id into v_rev_id;

  -- Reabre a parcela
  v_settled  := v_tx.amount - v_tx.interest_amount + v_tx.discount_amount;
  v_new_paid := greatest(v_inst.paid_amount - v_settled, 0);

  update payable_installments
    set paid_amount = v_new_paid,
        status = case when v_new_paid <= 0 then 'open' else 'partially_paid' end
    where id = v_inst.id;

  -- Recalcula a conta a pagar
  select bool_and(status = 'paid'), bool_or(paid_amount > 0)
    into v_all_paid, v_any_paid
    from payable_installments
    where payable_id = v_inst.payable_id and status <> 'cancelled';

  update payables
    set status = case
      when coalesce(v_all_paid, false) then 'paid'
      when coalesce(v_any_paid, false) then 'partially_paid'
      else 'open' end
    where id = v_inst.payable_id;

  -- Devolve o saldo à conta
  update financial_accounts
    set current_balance = current_balance + v_tx.amount
    where id = v_tx.account_id;

  return jsonb_build_object('reversal_id', v_rev_id);
end $$;


-- ============================================================================
-- FASE 06 — CAIXA COM SESSÃO (tabelas + RPCs; a UI do PDV será ligada depois)
-- ============================================================================

create table if not exists public.cash_sessions (
  id               bigint generated always as identity primary key,
  account_id       bigint not null references public.financial_accounts(id),
  operator_id      uuid,
  opened_at        timestamptz not null default now(),
  opening_amount   numeric(12,2) not null default 0,
  closed_at        timestamptz,
  expected_amount  numeric(12,2),
  counted_amount   numeric(12,2),
  difference       numeric(12,2),
  status           text not null default 'open' check (status in ('open','closed')),
  notes            text
);

create index if not exists idx_cash_sessions_status on public.cash_sessions (status);

create table if not exists public.cash_movements (
  id               bigint generated always as identity primary key,
  cash_session_id  bigint not null references public.cash_sessions(id),
  type             text not null check (type in ('sale','withdrawal','supply','adjustment')),
  direction        text not null check (direction in ('in','out')),
  amount           numeric(12,2) not null check (amount > 0),
  payment_method   text,
  reference_id     bigint,          -- ex.: sales.id
  notes            text,
  created_by       uuid,
  created_at       timestamptz not null default now()
);

create index if not exists idx_cash_movements_session on public.cash_movements (cash_session_id);

-- Vínculo aditivo da venda com o turno de caixa (nulo até a UI ser ligada)
alter table public.sales add column if not exists cash_session_id bigint references public.cash_sessions(id);

create or replace function public.abrir_caixa(
  p_account_id  bigint,
  p_opening     numeric,
  p_operator_id uuid default null
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id bigint;
begin
  if exists (select 1 from cash_sessions where account_id = p_account_id and status = 'open') then
    raise exception 'Já existe uma sessão de caixa aberta para esta conta';
  end if;

  insert into cash_sessions (account_id, operator_id, opening_amount)
  values (p_account_id, p_operator_id, coalesce(p_opening, 0))
  returning id into v_session_id;

  return v_session_id;
end $$;

create or replace function public.fechar_caixa(
  p_session_id bigint,
  p_counted    numeric,
  p_notes      text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session  cash_sessions%rowtype;
  v_expected numeric;
begin
  select * into v_session from cash_sessions where id = p_session_id for update;
  if not found then
    raise exception 'Sessão % não encontrada', p_session_id;
  end if;
  if v_session.status <> 'open' then
    raise exception 'Sessão já está fechada';
  end if;

  -- Esperado = abertura + entradas em dinheiro − saídas
  select v_session.opening_amount
       + coalesce(sum(case when direction = 'in'  then amount else 0 end), 0)
       - coalesce(sum(case when direction = 'out' then amount else 0 end), 0)
    into v_expected
    from cash_movements
    where cash_session_id = p_session_id;

  update cash_sessions
    set status = 'closed',
        closed_at = now(),
        expected_amount = v_expected,
        counted_amount = p_counted,
        difference = coalesce(p_counted, 0) - v_expected,
        notes = coalesce(p_notes, notes)
    where id = p_session_id;

  return jsonb_build_object(
    'session_id', p_session_id,
    'expected', v_expected,
    'counted', p_counted,
    'difference', coalesce(p_counted, 0) - v_expected
  );
end $$;


-- ============================================================================
-- FINAL — RLS, GRANTS E SEEDS
-- ============================================================================

-- ---- RLS: acesso total para usuários autenticados (mesmo padrão do app) ----
do $$
declare
  t text;
begin
  foreach t in array array[
    'suppliers','stock_movements','purchase_orders','purchase_order_items',
    'goods_receipts','goods_receipt_items','financial_accounts',
    'financial_categories','payables','payable_installments',
    'financial_transactions','cash_sessions','cash_movements'
  ] loop
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

-- ---- Grants de execução das RPCs ----
grant execute on function public.registrar_movimento_estoque(bigint, text, numeric, numeric, text, bigint, text) to authenticated;
grant execute on function public.confirmar_recebimento(bigint, jsonb, bigint) to authenticated;
grant execute on function public.estornar_recebimento(bigint) to authenticated;
grant execute on function public.criar_conta_pagar_manual(text, numeric, jsonb, bigint, bigint, date, text) to authenticated;
grant execute on function public.baixar_parcela(bigint, bigint, numeric, numeric, numeric, text, date, text) to authenticated;
grant execute on function public.estornar_baixa(bigint) to authenticated;
grant execute on function public.abrir_caixa(bigint, numeric, uuid) to authenticated;
grant execute on function public.fechar_caixa(bigint, numeric, text) to authenticated;

-- ---- Seeds: contas e categorias padrão (só insere se não existir) ----
insert into public.financial_accounts (name, type)
select 'Caixa da Loja', 'cash'
where not exists (select 1 from public.financial_accounts where name = 'Caixa da Loja');

insert into public.financial_accounts (name, type)
select 'Conta Bancária Principal', 'bank'
where not exists (select 1 from public.financial_accounts where name = 'Conta Bancária Principal');

insert into public.financial_categories (name, type)
select v.name, v.type
from (values
  ('Compra de Mercadoria', 'expense'),
  ('Aluguel',              'expense'),
  ('Salários e Encargos',  'expense'),
  ('Energia / Água / Internet', 'expense'),
  ('Marketing',            'expense'),
  ('Taxas de Cartão',      'expense'),
  ('Impostos',             'expense'),
  ('Outras Despesas',      'expense'),
  ('Vendas',               'income'),
  ('Outras Receitas',      'income')
) as v(name, type)
where not exists (
  select 1 from public.financial_categories fc
  where fc.name = v.name and fc.type = v.type
);

-- ============================================================================
-- FIM — Verificação rápida (opcional): deve listar as 13 tabelas novas
-- select table_name from information_schema.tables
--  where table_schema = 'public' and table_name in (
--    'suppliers','stock_movements','purchase_orders','purchase_order_items',
--    'goods_receipts','goods_receipt_items','financial_accounts',
--    'financial_categories','payables','payable_installments',
--    'financial_transactions','cash_sessions','cash_movements');
-- ============================================================================
