import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { getAuthenticatedUser } from '@/src/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const MAX_ITEMS = 100;
const MAX_QTY = 999;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  const { items, customer, slug, user_id, shipping, coupon_code, recipient } = body;

  // ── Validação de input ──────────────────────────────────────────────
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Loja inválida' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: 'Itens inválidos' }, { status: 400 });
  }
  for (const item of items) {
    const qty = Number(item?.quantity);
    if (!Number.isFinite(Number(item?.sku)) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return NextResponse.json({ error: 'Itens inválidos' }, { status: 400 });
    }
  }
  if (!customer || typeof customer.name !== 'string' || !customer.name.trim()) {
    return NextResponse.json({ error: 'Nome do cliente obrigatório' }, { status: 400 });
  }

  const { data: config } = await supabaseAdmin
    .from('website_config')
    .select('mercadopago_access_token, store_name, discount_global_percent, discount_min_order_amount, discount_min_order_percent')
    .eq('slug', slug)
    .single();

  if (!config?.mercadopago_access_token) {
    return NextResponse.json({ error: 'Pagamento não configurado para esta loja' }, { status: 400 });
  }

  // ── SEGURANÇA: re-precifica os itens pelo banco (nunca confiar no preço do browser) ──
  const skus = items.map((i: { sku: number | string }) => Number(i.sku));
  const { data: produtos } = await supabaseAdmin
    .from('products')
    .select('sku, name, price')
    .in('sku', skus)
    .eq('show_on_website', true)
    .neq('is_active', false);

  const prodMap = new Map((produtos || []).map(p => [Number(p.sku), p]));
  const safeItems: Array<{ sku: number; name: string; unit_price: number; quantity: number }> = [];
  for (const item of items) {
    const prod = prodMap.get(Number(item.sku));
    if (!prod) {
      return NextResponse.json({ error: 'Produto indisponível no catálogo' }, { status: 400 });
    }
    safeItems.push({
      sku: Number(prod.sku),
      name: prod.name,
      unit_price: Number(prod.price ?? 0),
      quantity: Number(item.quantity),
    });
  }

  const subtotal = safeItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  // ── SEGURANÇA: recalcula descontos server-side (mesma regra do checkout) ──
  const globalDiscountPercent = Number(config.discount_global_percent ?? 0);
  const minOrderAmount = config.discount_min_order_amount != null ? Number(config.discount_min_order_amount) : null;
  const minOrderPercent = Number(config.discount_min_order_percent ?? 0);

  let autoDiscountPercent = globalDiscountPercent;
  if (minOrderAmount != null && subtotal >= minOrderAmount && minOrderPercent > autoDiscountPercent) {
    autoDiscountPercent = minOrderPercent;
  }
  const autoDiscountAmount = Math.round((subtotal * autoDiscountPercent) / 100 * 100) / 100;

  let couponDiscount = 0;
  let validCouponCode: string | null = null;
  if (coupon_code && typeof coupon_code === 'string') {
    const { data: coupon } = await supabaseAdmin
      .from('store_coupons')
      .select('*')
      .eq('code', coupon_code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    const expirado = coupon?.expires_at && new Date(coupon.expires_at) < new Date();
    const esgotado = coupon?.max_uses != null && coupon.uses_count >= coupon.max_uses;
    const abaixoMinimo = coupon?.min_order_amount != null && subtotal < coupon.min_order_amount;

    if (coupon && !expirado && !esgotado && !abaixoMinimo) {
      couponDiscount = coupon.type === 'percentage'
        ? Math.round((subtotal * coupon.value) / 100 * 100) / 100
        : Math.min(Number(coupon.value), subtotal);
      validCouponCode = coupon.code;
    }
  }

  const discountAmount = Math.min(subtotal, autoDiscountAmount + couponDiscount);
  const shippingCost = Math.max(0, Number(shipping?.cost) || 0);
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  // ── SEGURANÇA: só vincula user_id se for o usuário da sessão atual ──
  let safeUserId: string | null = null;
  if (user_id) {
    const sessionUser = await getAuthenticatedUser();
    if (sessionUser && sessionUser.id === user_id) safeUserId = user_id;
  }

  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/loja')[0] || 'http://localhost:3000';

  const { data: order } = await supabaseAdmin
    .from('website_orders')
    .insert([{
      customer_name: customer.name.trim().slice(0, 200),
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      items: safeItems,
      total_amount: finalTotal,
      payment_status: 'pending',
      user_id: safeUserId,
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
      coupon_code: validCouponCode,
    }])
    .select()
    .single();

  const client = new MercadoPagoConfig({ accessToken: config.mercadopago_access_token });
  const preference = new Preference(client);

  // Build MP items: products + shipping as item if applicable
  const mpItems = safeItems.map(item => ({
    id: String(item.sku),
    title: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
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
      title: validCouponCode ? `Desconto - Cupom ${validCouponCode}` : 'Desconto',
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
