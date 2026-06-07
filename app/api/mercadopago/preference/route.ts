import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: NextRequest) {
  const { items, customer, slug, user_id, shipping, discount, coupon_code, recipient } = await req.json();

  const { data: config } = await supabaseAdmin
    .from('website_config')
    .select('mercadopago_access_token, store_name')
    .eq('slug', slug)
    .single();

  if (!config?.mercadopago_access_token) {
    return NextResponse.json({ error: 'Pagamento não configurado para esta loja' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/loja')[0] || 'http://localhost:3000';

  const subtotal = items.reduce((sum: number, item: { unit_price: number; quantity: number }) => sum + item.unit_price * item.quantity, 0);
  const shippingCost = shipping?.cost ?? 0;
  const discountAmount = discount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  const { data: order } = await supabaseAdmin
    .from('website_orders')
    .insert([{
      customer_name: customer.name,
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      items,
      total_amount: finalTotal,
      payment_status: 'pending',
      user_id: user_id || null,
      // Shipping
      shipping_status: 'pending',
      shipping_cost: shippingCost,
      shipping_method: shipping?.method || null,
      shipping_carrier: shipping?.carrier || null,
      // Recipient address
      recipient_cep: recipient?.cep || null,
      recipient_street: recipient?.street || null,
      recipient_number: recipient?.number || null,
      recipient_complement: recipient?.complement || null,
      recipient_city: recipient?.city || null,
      recipient_state: recipient?.state || null,
      // Discounts
      discount_amount: discountAmount,
      coupon_code: coupon_code || null,
    }])
    .select()
    .single();

  const client = new MercadoPagoConfig({ accessToken: config.mercadopago_access_token });
  const preference = new Preference(client);

  // Build MP items: products + shipping as item if applicable
  const mpItems = items.map((item: { sku: number | string; name: string; quantity: number; unit_price: number }) => ({
    id: String(item.sku),
    title: item.name,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    currency_id: 'BRL',
  }));

  if (shippingCost > 0) {
    mpItems.push({
      id: 'frete',
      title: `Frete - ${shipping?.carrier || ''} ${shipping?.method || ''}`.trim(),
      quantity: 1,
      unit_price: shippingCost,
      currency_id: 'BRL',
    });
  }

  // Apply discount as a negative item if needed
  if (discountAmount > 0) {
    mpItems.push({
      id: 'desconto',
      title: coupon_code ? `Desconto - Cupom ${coupon_code}` : 'Desconto',
      quantity: 1,
      unit_price: -discountAmount,
      currency_id: 'BRL',
    });
  }

  const pref = await preference.create({
    body: {
      items: mpItems,
      payer: {
        name: customer.name,
        ...(customer.email ? { email: customer.email } : {}),
        ...(customer.phone ? { phone: { number: customer.phone.replace(/\D/g, '') } } : {}),
        ...(recipient?.cep ? {
          address: {
            zip_code: recipient.cep,
            street_name: recipient.street || '',
            street_number: recipient.number || '0',
          },
        } : {}),
      },
      back_urls: {
        success: `${origin}/loja/${slug}/sucesso?order=${order?.id}`,
        failure: `${origin}/loja/${slug}/erro`,
        pending: `${origin}/loja/${slug}/pendente?order=${order?.id}`,
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
