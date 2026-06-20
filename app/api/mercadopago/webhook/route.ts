import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { createHmac } from 'crypto';

// Janela máxima aceita entre o timestamp do webhook e agora (anti-replay)
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

async function verificarAssinatura(req: NextRequest, dataId: string): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Sem secret configurado: NUNCA aceitar em produção (fail-closed).
    // Em dev, permite para facilitar testes locais.
    if (process.env.NODE_ENV === 'production') {
      console.error('MP_WEBHOOK_SECRET não configurado — webhook rejeitado.');
      return false;
    }
    return true;
  }

  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  // Extrai ts e v1 do header x-signature: "ts=...,v1=..."
  const parts = Object.fromEntries(xSignature.split(',').map(p => p.trim().split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Anti-replay: rejeita webhooks com timestamp fora da janela aceitável
  const tsMs = Number(ts) * (ts.length <= 10 ? 1000 : 1); // MP envia em ms; tolera segundos
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > MAX_WEBHOOK_AGE_MS) {
    return false;
  }

  // Manifesto definido pelo MercadoPago
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = createHmac('sha256', secret).update(manifest).digest('hex');

  // Comparação em tempo constante para evitar timing attacks
  if (hmac.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hmac.length; i++) diff |= hmac.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type !== 'payment' || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const valido = await verificarAssinatura(req, String(body.data.id));
  if (!valido) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }

  const { data: config } = await supabaseAdmin
    .from('website_config')
    .select('mercadopago_access_token')
    .limit(1)
    .maybeSingle();

  if (!config?.mercadopago_access_token) {
    return NextResponse.json({ error: 'Access token não configurado' }, { status: 500 });
  }

  const mpClient = new MercadoPagoConfig({ accessToken: config.mercadopago_access_token });
  const paymentClient = new Payment(mpClient);
  const payment = await paymentClient.get({ id: body.data.id });

  if (payment.status !== 'approved') {
    return NextResponse.json({ ok: true, status: payment.status });
  }

  const orderId = payment.external_reference;
  if (!orderId) return NextResponse.json({ ok: true });

  // Busca o pedido
  const { data: order } = await supabaseAdmin
    .from('website_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order || order.payment_status === 'paid') {
    return NextResponse.json({ ok: true, already_processed: !order ? false : true });
  }

  const items: Array<{ sku: number; name: string; unit_price: number; quantity: number }> = order.items;
  const skus = items.map(i => i.sku);

  const { data: produtos } = await supabaseAdmin
    .from('products')
    .select('sku, cost, barcode')
    .in('sku', skus);

  const prodMap = new Map((produtos || []).map(p => [p.sku, p]));
  const totalAmount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const { data: sale } = await supabaseAdmin
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

  if (sale) {
    await supabaseAdmin.from('sale_items').insert(
      items.map(i => {
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
      })
    );
  }

  await supabaseAdmin
    .from('website_orders')
    .update({ payment_status: 'paid', mp_payment_id: String(payment.id), mp_status: 'approved' })
    .eq('id', orderId);

  return NextResponse.json({ ok: true, sale_id: sale?.id });
}
