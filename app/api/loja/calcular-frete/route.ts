import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { slug, destination_cep, total_amount } = await req.json();

  const cepDestino = destination_cep?.replace(/\D/g, '');
  if (!cepDestino || cepDestino.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });
  }

  const { data: config } = await supabaseAdmin
    .from('website_config')
    .select('shipping_origin_cep, package_default_weight, package_default_height, package_default_width, package_default_length, melhor_envio_token, free_shipping_min_amount')
    .eq('slug', slug)
    .single();

  if (!config?.melhor_envio_token) {
    return NextResponse.json({ error: 'Frete não configurado' }, { status: 400 });
  }

  if (!config.shipping_origin_cep) {
    return NextResponse.json({ error: 'CEP de origem não configurado' }, { status: 400 });
  }

  const cepOrigem = config.shipping_origin_cep.replace(/\D/g, '');

  const meResponse = await fetch('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.melhor_envio_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NexusStores (contato@nexusstores.com.br)',
    },
    body: JSON.stringify({
      from: { postal_code: cepOrigem },
      to: { postal_code: cepDestino },
      package: {
        height: Number(config.package_default_height) || 10,
        width: Number(config.package_default_width) || 15,
        length: Number(config.package_default_length) || 20,
        weight: Number(config.package_default_weight) || 0.5,
      },
      options: {
        insurance_value: total_amount || 50,
        receipt: false,
        own_hand: false,
      },
    }),
  });

  if (!meResponse.ok) {
    const err = await meResponse.text();
    console.error('Melhor Envio error:', err);
    return NextResponse.json({ error: 'Erro ao calcular frete com Melhor Envio' }, { status: 500 });
  }

  const rates: any[] = await meResponse.json();
  const freeShipping = config.free_shipping_min_amount != null && total_amount >= Number(config.free_shipping_min_amount);

  const options = rates
    .filter(r => r.price != null && !r.error)
    .map(r => ({
      id: r.id,
      name: r.name,
      company: r.company?.name ?? '',
      price: freeShipping ? 0 : parseFloat(r.price),
      original_price: parseFloat(r.price),
      delivery_time: r.delivery_time ?? r.delivery_range?.max ?? null,
      free: freeShipping,
    }))
    .sort((a, b) => a.price - b.price);

  return NextResponse.json({ options });
}
