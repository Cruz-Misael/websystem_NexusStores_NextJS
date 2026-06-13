import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

/**
 * Verifica junto ao Mercado Pago se existe um pagamento APROVADO para este pedido.
 * Nunca confiar no status enviado pelo cliente — o chamador desta rota é o browser.
 * Retorna o id do pagamento aprovado ou null.
 */
async function verificarPagamentoAprovado(orderId: string, mpPaymentId?: string): Promise<string | null> {
  const { data: config } = await supabaseAdmin
    .from('website_config')
    .select('mercadopago_access_token')
    .limit(1)
    .maybeSingle();

  if (!config?.mercadopago_access_token) return null;

  const mpClient = new MercadoPagoConfig({ accessToken: config.mercadopago_access_token });
  const paymentClient = new Payment(mpClient);

  try {
    // Caminho rápido: o cliente informou o id do pagamento
    if (mpPaymentId) {
      const payment = await paymentClient.get({ id: mpPaymentId });
      if (payment.status === 'approved' && String(payment.external_reference) === String(orderId)) {
        return String(payment.id);
      }
    }

    // Fallback: busca pagamentos pelo external_reference (id do pedido)
    const search = await paymentClient.search({
      options: { external_reference: String(orderId) },
    });
    const aprovado = (search.results || []).find(p => p.status === 'approved');
    return aprovado ? String(aprovado.id) : null;
  } catch {
    return null;
  }
}

// Cria uma venda na tabela sales a partir de um website_order confirmado.
// Idempotente: checa se já existe venda com este pedido antes de criar.
export async function POST(req: NextRequest) {
  const { order_id, mp_payment_id } = await req.json();
  if (!order_id || typeof order_id !== 'string') {
    return NextResponse.json({ error: 'order_id obrigatório' }, { status: 400 });
  }

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

  // SEGURANÇA: confirma com o Mercado Pago que o pagamento realmente foi aprovado.
  // Sem isso, qualquer pessoa poderia marcar pedidos como pagos.
  const paymentIdAprovado = await verificarPagamentoAprovado(order_id, mp_payment_id);
  if (!paymentIdAprovado) {
    return NextResponse.json({ ok: false, error: 'Pagamento não confirmado pelo Mercado Pago' }, { status: 402 });
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

  // Atualiza o pedido como pago — usa o id do pagamento VERIFICADO, não o do body
  await supabaseAdmin
    .from('website_orders')
    .update({
      payment_status: 'paid',
      mp_payment_id: paymentIdAprovado,
      mp_status: 'approved',
    })
    .eq('id', order_id);

  return NextResponse.json({ ok: true, sale_id: sale.id });
}
