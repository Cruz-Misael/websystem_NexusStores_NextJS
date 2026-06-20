import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { code, order_amount } = await req.json();

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, message: 'Informe o código do cupom' });
  }

  const { data: coupon } = await supabaseAdmin
    .from('store_coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle();

  if (!coupon) {
    return NextResponse.json({ valid: false, message: 'Cupom não encontrado ou inativo' });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, message: 'Este cupom está expirado' });
  }

  if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, message: 'Este cupom já atingiu o limite de usos' });
  }

  if (coupon.min_order_amount != null && order_amount < coupon.min_order_amount) {
    return NextResponse.json({
      valid: false,
      message: `Pedido mínimo de ${Number(coupon.min_order_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para usar este cupom`,
    });
  }

  const discount_amount = coupon.type === 'percentage'
    ? Math.round((order_amount * coupon.value) / 100 * 100) / 100
    : Math.min(coupon.value, order_amount);

  return NextResponse.json({
    valid: true,
    id: coupon.id,
    type: coupon.type,
    value: coupon.value,
    discount_amount,
    message: coupon.type === 'percentage'
      ? `${coupon.value}% de desconto aplicado!`
      : `${Number(coupon.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto aplicado!`,
  });
}
