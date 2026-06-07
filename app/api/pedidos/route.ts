import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const payment_status = searchParams.get('payment_status');
  const shipping_status = searchParams.get('shipping_status');

  let query = supabaseAdmin
    .from('website_orders')
    .select(
      'id, customer_name, customer_email, customer_phone, items, total_amount, discount_amount, shipping_cost, payment_status, shipping_status, tracking_code, shipping_method, shipping_carrier, recipient_cep, recipient_street, recipient_number, recipient_complement, recipient_city, recipient_state, coupon_code, created_at, mp_payment_id'
    )
    .order('created_at', { ascending: false });

  if (payment_status) query = query.eq('payment_status', payment_status);
  if (shipping_status) query = query.eq('shipping_status', shipping_status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: data || [] });
}
