import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: config, error } = await supabaseAdmin
    .from('website_config')
    .select('id, slug, store_name, tagline, description, banner_url, primary_color, whatsapp_number, instagram_url, show_prices, mercadopago_public_key, is_published')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !config) {
    return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 });
  }

  if (!config.is_published) {
    return NextResponse.json({ error: 'Loja não está publicada' }, { status: 403 });
  }

  const [{ data: products }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('sku, name, description, price, imagem, category, stock_quantity, color, size')
      .eq('show_on_website', true)
      .neq('is_active', false)
      .order('name'),
    supabaseAdmin
      .from('companies')
      .select('logo_url')
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    config: { ...config, logo_url: company?.logo_url ?? null },
    products: products || [],
  });
}
