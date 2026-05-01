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

  if (!session && !isAuthPage) {
    // Se não há sessão e não é a página de login, redireciona para login
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (session && !isAuthPage) {
    // Se há sessão e não é a página de login, verifica autorização
    const { data: authorizedUser, error } = await supabase
      .from('authorized_users')
      .select('status')
      .eq('user_id', session.user.id)
      .single();

    if (error || !authorizedUser || authorizedUser.status !== 'ativo') {
      // Se não autorizado, desloga e redireciona para login com erro
      await supabase.auth.signOut();
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (session && isAuthPage) {
    // Se há sessão e está na página de login, redireciona para o dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url));
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
