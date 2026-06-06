// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
            req.cookies.set({ name, value, ...options });
            res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
            req.cookies.set({ name, value: '', ...options });
            res.cookies.set({ name, value: '', ...options });
        }
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isLandingPage = req.nextUrl.pathname === '/';

  if (!session && !isAuthPage && !isLandingPage) {
    // Se não há sessão e não é página pública, redireciona para login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && !isAuthPage && !isLandingPage) {
    // Se há sessão e não é página pública, verifica autorização
    const { data: authorizedUser, error } = await supabase
      .from('authorized_users')
      .select('status')
      .eq('user_id', session.user.id)
      .single();

    if (error || !authorizedUser || authorizedUser.status !== 'ativo') {
      // Não chama signOut() aqui — o cookie não seria limpo no redirect.
      // O cliente faz o signOut ao detectar o erro na página de login.
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (session && isAuthPage) {
    // Só redireciona pro dashboard se o usuário ainda está ativo.
    // Caso contrário, deixa o login renderizar normalmente.
    const { data: authorizedUser } = await supabase
      .from('authorized_users')
      .select('status')
      .eq('user_id', session.user.id)
      .single();

    if (authorizedUser?.status === 'ativo') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
