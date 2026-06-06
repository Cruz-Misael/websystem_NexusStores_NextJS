// app/api/update-user/route.ts
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem editar usuários.' }, { status: 403 });
    }

    const { id, full_name, phone, role, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    const { error } = await supabaseAdmin
      .from('authorized_users')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Usuário atualizado com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ error: `Erro inesperado: ${err.message}` }, { status: 500 });
  }
}
