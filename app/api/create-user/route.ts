// app/api/create-user/route.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

async function getCallerRole(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabaseAdmin
    .from('authorized_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('status', 'ativo')
    .single();
  return data?.role ?? null;
}

export async function POST(req: Request) {
  try {
    const callerRole = await getCallerRole(req);
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }, { status: 403 });
    }

    const { email, password, name, role } = await req.json();

    // 1. Criar usuário no Supabase Auth usando o cliente admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Pré-confirma o e-mail — acesso imediato sem confirmação
      user_metadata: { name }
    });

    if (authError) {
      // Retorna uma mensagem de erro clara do Supabase
      return NextResponse.json({ error: authError.message }, { status: 422 });
    }

    const user = authData.user;
    if (!user) {
        return NextResponse.json({ error: 'Falha ao criar usuário na autenticação.' }, { status: 500 });
    }

    // 2. Adicionar o usuário à tabela 'authorized_users'
    const { error: insertError } = await supabaseAdmin
      .from('authorized_users')
      .insert({
        user_id: user.id,
        email: user.email,
        full_name: name,
        role: role,
        status: 'ativo'
      });

    if (insertError) {
        // Se a inserção falhar, deleta o usuário recém-criado para evitar inconsistência
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        return NextResponse.json({ error: `Falha ao autorizar usuário: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Usuário criado e autorizado com sucesso!', user }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: `Erro inesperado: ${error.message}` }, { status: 500 });
  }
}
