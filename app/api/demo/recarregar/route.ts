// app/api/demo/recarregar/route.ts
// Volta o ambiente de demonstração para os dados de exemplo.
//
// Disparado todo dia pelo cron da Vercel (vercel.json), que manda o
// CRON_SECRET no header Authorization. Um admin logado também pode chamar,
// por POST, para deixar a loja limpa antes de uma apresentação.
//
// Fora do ambiente de demonstração responde 404 — inclusive no deploy da
// Íntima Sedução, onde o mesmo cron também bate aqui.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { requireOperator } from '@/src/lib/supabase/server';
import { demoPodeRodarAqui } from '@/src/lib/demo';
import { recarregarDemo } from '@/src/lib/demo-dados';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function executar() {
  try {
    const resumo = await recarregarDemo(supabaseAdmin, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    console.log('Demonstração recarregada.', JSON.stringify(resumo));
    return NextResponse.json({ ok: true, ...resumo });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    console.error('Demonstração: recarga falhou.', mensagem);
    return NextResponse.json({ ok: false, error: mensagem }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!demoPodeRodarAqui()) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  const esperado = process.env.CRON_SECRET;
  if (!esperado || req.headers.get('authorization') !== `Bearer ${esperado}`) {
    if (!esperado) console.error('CRON_SECRET não configurado — recarga da demonstração recusada.');
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return executar();
}

export async function POST() {
  if (!demoPodeRodarAqui()) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  const auth = await requireOperator();
  if (auth?.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return executar();
}
