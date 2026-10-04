import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const protectedPaths = ['/planner', '/journey', '/week', '/mistakes', '/profile'];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  // If visitor is not authenticated and attempts to access protected routes, redirect to /login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If visitor is already authenticated and visits /login, redirect to /planner
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/planner', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/planner/:path*', '/journey/:path*', '/week/:path*', '/mistakes/:path*', '/profile/:path*', '/login'],
};
