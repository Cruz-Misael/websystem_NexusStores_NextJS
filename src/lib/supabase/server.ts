// src/lib/supabase/server.ts
// Helpers de autenticação para Route Handlers (server-side).
// Lê a sessão do usuário a partir dos cookies (@supabase/ssr) e
// valida autorização contra a tabela authorized_users.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './admin';

/** Cria um client Supabase server-side vinculado aos cookies da requisição. */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* Route Handlers podem não permitir set — leitura é o que importa aqui */ }
        },
      },
    }
  );
}

/** Retorna o usuário autenticado (validado junto ao Supabase Auth) ou null. */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Exige um operador do sistema (admin/gerente/colaborador) com status ativo.
 * Retorna { user, role } ou null se não autenticado/não autorizado.
 * Use nas rotas internas do painel — clientes da loja NÃO passam aqui.
 */
export async function requireOperator(): Promise<{ user: User; role: string } | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from('authorized_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('status', 'ativo')
    .single();

  if (!data?.role) return null;
  return { user, role: data.role };
}
