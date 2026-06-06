import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: NextRequest) {
  const { items, customer, slug } = await req.json();

  const { data: config } = await supabaseAdmin
    .from('website_config')
    .select('mercadopago_access_token, store_name')
    .eq('slug', slug)
    .single();

  if (!config?.mercadopago_access_token) {
    return NextResponse.json({ error: 'Pagamento não configurado para esta loja' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/loja')[0] || 'http://localhost:3000';

  const total = items.reduce((sum: number, item: any) => sum + item.unit_price * item.quantity, 0);

  const { data: order } = await supabaseAdmin
    .from('website_orders')
    .insert([{
      customer_name: customer.name,
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      items,
      total_amount: total,
      payment_status: 'pending',
    }])
    .select()
    .single();

  const client = new MercadoPagoConfig({ accessToken: config.mercadopago_access_token });
  const preference = new Preference(client);

  const pref = await preference.create({
    body: {
      items: items.map((item: any) => ({
        id: String(item.sku),
        title: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        currency_id: 'BRL',
      })),
      payer: {
        name: customer.name,
        ...(customer.email ? { email: customer.email } : {}),
        ...(customer.phone ? { phone: { number: customer.phone.replace(/\D/g, '') } } : {}),
      },
      back_urls: {
        success: `${origin}/loja/${slug}/sucesso?order=${order?.id}`,
        failure: `${origin}/loja/${slug}/erro`,
        pending: `${origin}/loja/${slug}/pendente`,
      },
      auto_return: 'approved',
      external_reference: order?.id,
      statement_descriptor: config.store_name?.slice(0, 22) || 'LOJA ONLINE',
    },
  });

  if (order?.id && pref.id) {
    await supabaseAdmin
      .from('website_orders')
      .update({ mp_preference_id: pref.id })
      .eq('id', order.id);
  }

  return NextResponse.json({
    preference_id: pref.id,
    sandbox_init_point: pref.sandbox_init_point,
    init_point: pref.init_point,
  });
}
