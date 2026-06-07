import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendOrderStatusEmail } from '@/src/services/email.service';

const EMAIL_STATUSES = new Set(['preparing', 'shipped', 'delivered']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ['shipping_status', 'tracking_code', 'payment_status'];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  // Fetch current order before update to detect status change
  const { data: current } = await supabaseAdmin
    .from('website_orders')
    .select('customer_email, customer_name, items, shipping_status')
    .eq('id', id)
    .single();

  const { data, error } = await supabaseAdmin
    .from('website_orders')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget email when shipping_status changes to a notifiable state
  const newStatus = update.shipping_status;
  if (
    newStatus &&
    EMAIL_STATUSES.has(newStatus) &&
    newStatus !== current?.shipping_status &&
    current?.customer_email
  ) {
    const { data: storeConfig } = await supabaseAdmin
      .from('website_config')
      .select('store_name')
      .limit(1)
      .single();

    sendOrderStatusEmail({
      to: current.customer_email,
      customerName: current.customer_name || 'Cliente',
      orderId: id,
      storeName: storeConfig?.store_name || 'Nossa Loja',
      newStatus,
      trackingCode: update.tracking_code ?? data.tracking_code,
      items: current.items,
    }).catch(() => {});
  }

  return NextResponse.json({ order: data });
}
