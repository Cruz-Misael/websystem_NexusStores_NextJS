import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Cria uma venda na tabela sales a partir de um website_order confirmado.
// Idempotente: checa se já existe venda com este pedido antes de criar.
export async function POST(req: NextRequest) {
  const { order_id, mp_payment_id, mp_status } = await req.json();
  if (!order_id) return NextResponse.json({ error: 'order_id obrigatório' }, { status: 400 });

  // Busca o pedido
  const { data: order, error: orderError } = await supabaseAdmin
    .from('website_orders')
    .select('*')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  // Verifica se já foi processado (evita duplicatas)
  if (order.payment_status === 'paid') {
    return NextResponse.json({ ok: true, already_processed: true });
  }

  const items: Array<{ sku: number; name: string; unit_price: number; quantity: number }> = order.items;

  // Busca produtos para pegar custo e barcode
  const skus = items.map(i => i.sku);
  const { data: produtos } = await supabaseAdmin
    .from('products')
    .select('sku, name, price, cost, barcode')
    .in('sku', skus);

  const prodMap = new Map((produtos || []).map(p => [p.sku, p]));

  // Calcula totais
  const totalAmount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  // Cria a venda principal
  const { data: sale, error: saleError } = await supabaseAdmin
    .from('sales')
    .insert([{
      sale_date: order.created_at,
      total_amount: totalAmount,
      discount_amount: 0,
      final_amount: totalAmount,
      payment_method: 'mercadopago',
      payment_status: 'paid',
      observation: `Pedido online — ${order.customer_name}${order.customer_phone ? ` (${order.customer_phone})` : ''}`,
      source: 'site',
    }])
    .select()
    .single();

  if (saleError || !sale) {
    return NextResponse.json({ error: saleError?.message || 'Erro ao criar venda' }, { status: 500 });
  }

  // Cria os itens da venda
  const saleItems = items.map(i => {
    const prod = prodMap.get(i.sku);
    return {
      sale_id: sale.id,
      product_id: i.sku,
      product_name: i.name,
      product_sku: String(i.sku),
      product_barcode: prod?.barcode ? String(prod.barcode) : null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      unit_cost: prod?.cost || 0,
      discount_per_item: 0,
      total_price: i.unit_price * i.quantity,
    };
  });

  await supabaseAdmin.from('sale_items').insert(saleItems);

  // Atualiza o pedido como pago
  await supabaseAdmin
    .from('website_orders')
    .update({
      payment_status: 'paid',
      mp_payment_id: mp_payment_id || null,
      mp_status: mp_status || 'approved',
    })
    .eq('id', order_id);

  return NextResponse.json({ ok: true, sale_id: sale.id });
}
