import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const isDemo = request.cookies.get('orbit_demo')?.value === 'true' || request.nextUrl.searchParams.get('demo') === 'true';

  let user = null;
  if (!isDemo) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.warn('Middleware auth check skipped due to network/config:', err);
    }
  }

  const protectedPaths = ['/planner', '/journey', '/week', '/mistakes', '/profile'];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isDemo && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if ((user || isDemo) && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/planner', request.url));
  }

  if (isDemo && !request.cookies.get('orbit_demo')) {
    response.cookies.set('orbit_demo', 'true', { path: '/', maxAge: 86400 * 30 });
  }

  return response;
}

export const config = {
  matcher: ['/planner/:path*', '/journey/:path*', '/week/:path*', '/mistakes/:path*', '/profile/:path*', '/login'],
};
