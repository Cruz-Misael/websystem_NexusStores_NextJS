// app/api/update-user-password/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem alterar senhas.' }, { status: 403 });
    }

    const { userId, password } = await req.json();

    // Validação básica
    if (!userId || !password) {
      return NextResponse.json(
        { error: 'ID do usuário e nova senha são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
        return NextResponse.json(
          { error: 'A senha deve ter no mínimo 6 caracteres.' },
          { status: 400 }
        );
      }

    // Use o cliente admin para atualizar os dados do usuário
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    );

    if (error) {
      console.error('Erro ao atualizar senha no Supabase:', error);
      return NextResponse.json(
        { error: 'Falha ao atualizar a senha do usuário.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Senha atualizada com sucesso.' });

  } catch (err) {
    console.error('Erro interno na API:', err);
    return NextResponse.json(
        { error: 'Ocorreu um erro interno no servidor.' },
        { status: 500 }
    );
  }
}
