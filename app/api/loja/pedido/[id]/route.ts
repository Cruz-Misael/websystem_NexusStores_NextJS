import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const slug = req.nextUrl.searchParams.get('slug');

  // Rota acessível sem login (página de sucesso do checkout, via link com UUID).
  // Não expor email/telefone aqui — a UI não usa e isso reduz vazamento de PII.
  const { data: order, error } = await supabaseAdmin
    .from('website_orders')
    .select('id, customer_name, items, total_amount, payment_status, created_at, mp_status')
    .eq('id', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  let config = null;
  if (slug) {
    const { data } = await supabaseAdmin
      .from('website_config')
      .select('store_name, primary_color, whatsapp_number, show_prices')
      .eq('slug', slug)
      .single();
    config = data;
  }

  return NextResponse.json({ order, config });
}
