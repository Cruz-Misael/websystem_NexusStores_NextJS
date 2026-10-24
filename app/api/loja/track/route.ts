import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

// Ignora acessos de bots/crawlers/pré-visualizações para não poluir os números.
const BOT_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegrambot|bingpreview|slurp|duckduckbot|preview|monitor|lighthouse|headless|pingdom|uptime/i;

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const tablet = /ipad|tablet|(android(?!.*mobile))/i.test(ua);
  const mobile = /mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua);
  const device = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop';

  let browser = 'Outro';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let os = 'Outro';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod|ios/i.test(ua)) os = 'iOS';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { device, browser, os };
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get('user-agent') || '';
    // Bots não contam
    if (!ua || BOT_RE.test(ua)) {
      return NextResponse.json({ ok: true, skipped: 'bot' });
    }

    const body = await req.json().catch(() => ({} as any));
    const path: string = String(body.path || '').slice(0, 300);
    if (!path.startsWith('/loja')) {
      return NextResponse.json({ ok: true, skipped: 'fora-da-loja' });
    }

    // slug = segmento após /loja/
    const slugMatch = path.match(/\/loja\/([^/?#]+)/);
    const slug = slugMatch ? decodeURIComponent(slugMatch[1]) : null;

    // Guarda só o domínio de origem (sem query string), e ignora auto-referência.
    let referrer_host: string | null = null;
    try {
      const ref = String(body.referrer || '');
      if (ref) {
        const host = new URL(ref).hostname;
        const selfHost = (req.headers.get('host') || '').split(':')[0];
        referrer_host = host && host !== selfHost ? host : null;
      }
    } catch {
      /* referrer inválido — ignora */
    }

    // Geolocalização automática pelos headers da Vercel (sem custo/serviço externo)
    const country = req.headers.get('x-vercel-ip-country') || null;
    const region = req.headers.get('x-vercel-ip-country-region') || null;
    const cityRaw = req.headers.get('x-vercel-ip-city');
    const city = cityRaw ? decodeURIComponent(cityRaw) : null;

    // IP usado APENAS para gerar o hash anônimo diário — nunca é armazenado.
    const ip =
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '';
    const dia = new Date().toISOString().slice(0, 10);
    const salt = process.env.ANALYTICS_SALT || 'nexus-store-intima-seducao';
    const visitor_hash = ip
      ? createHash('sha256').update(`${dia}|${ip}|${ua}|${salt}`).digest('hex').slice(0, 32)
      : null;

    const { device, browser, os } = parseUserAgent(ua);

    await supabaseAdmin.from('store_visits').insert({
      slug,
      path,
      referrer_host,
      device,
      browser,
      os,
      country,
      region,
      city,
      visitor_hash,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // O tracking nunca pode quebrar a navegação do cliente.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
