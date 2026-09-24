// app/api/loja/revalidar/route.ts
//
// A landing é cacheada (revalidate = 300). Sem esta rota, quem corrige um texto
// em Configurações salva, abre a página, não vê mudança nenhuma e conclui que o
// sistema não salvou — e salva de novo. O editor chama isto depois de gravar
// para derrubar o cache daquela página na hora.

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/src/lib/supabase/server';

export async function POST(req: NextRequest) {
  const operador = await requireOperator();
  if (!operador) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let slug: unknown;
  try {
    ({ slug } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  // Só o formato do slug, nada de caminho livre: `revalidatePath` com texto
  // vindo de fora é convite para invalidar rota alheia.
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug)) {
    return NextResponse.json({ error: 'Endereço do site inválido' }, { status: 400 });
  }

  revalidatePath(`/loja/${slug}`);
  return NextResponse.json({ ok: true });
}
