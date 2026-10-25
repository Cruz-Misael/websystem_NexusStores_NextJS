// app/api/demo/entrar/route.ts
// "Testar a demonstração": abre uma sessão na conta compartilhada dos visitantes.
//
// A conta não tem senha conhecida. O servidor gera um link de acesso com a
// chave de serviço (nenhum e-mail sai) e troca esse link por sessão aqui
// mesmo, gravando os cookies como o /auth/callback do login com Google faz.
//
// É POST de propósito: GET seria seguido por robô e por prefetch de link, e
// cada visita à página inicial abriria uma sessão sem ninguém clicar.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase/admin';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { DEMO_EMAIL, demoPodeRodarAqui } from '@/src/lib/demo';
import { garantirUsuarioDemo } from '@/src/lib/demo-dados';

/** Id da conta dos visitantes, se ela já está autorizada. */
async function contaAutorizada(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('authorized_users')
    .select('user_id')
    .eq('email', DEMO_EMAIL)
    .eq('status', 'ativo')
    .maybeSingle();
  return data?.user_id ?? null;
}

/**
 * Link de acesso da conta autorizada. O generateLink cria um usuário novo
 * quando o e-mail não existe — por isso a conta é garantida ANTES, e o link
 * só vale se saiu para ela.
 */
async function linkDaConta(): Promise<string> {
  let id = await contaAutorizada();
  if (!id) id = await garantirUsuarioDemo(supabaseAdmin);

  let { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: DEMO_EMAIL });
  if (!error && data.user?.id !== id) {
    id = await garantirUsuarioDemo(supabaseAdmin);
    ({ data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: DEMO_EMAIL }));
  }
  if (error || !data.properties?.hashed_token || data.user?.id !== id) {
    throw new Error(`link de acesso não gerado: ${error?.message ?? 'conta divergente'}`);
  }
  return data.properties.hashed_token;
}

export async function POST(req: NextRequest) {
  if (!demoPodeRodarAqui()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }
  const origem = new URL(req.url).origin;
  const supabase = await createServerSupabase();

  // Duas tentativas, cada uma com link novo: o link vale uma vez só, e uma
  // queda de rede na troca pode tê-lo gasto mesmo sem resposta.
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: await linkDaConta() });
      if (!error) return NextResponse.redirect(`${origem}/dashboard`, 303); // 303: o POST vira GET
      console.error(`Demonstração: sessão não aberta (tentativa ${tentativa}).`, error.message);
    } catch (e) {
      console.error(`Demonstração: falha ao preparar o acesso (tentativa ${tentativa}).`, e);
    }
  }
  return NextResponse.redirect(`${origem}/login?error=demo_indisponivel`, 303);
}
