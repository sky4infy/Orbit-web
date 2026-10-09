import { createServerClient } from '@supabase/ssr';
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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({
              name,
              value,
              ...options,
              maxAge: 60 * 60 * 24 * 365, // 1 year cookie persistence
            })
          );
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

  // Check if browser sent Supabase auth cookies
  const allCookies = request.cookies.getAll();
  const hasAuthCookies = allCookies.some(
    (c) => c.name.includes('-auth-token') || c.name.startsWith('sb-')
  );

  const protectedPaths = ['/planner', '/journey', '/week', '/mistakes', '/profile'];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  // Only redirect if visitor has NO auth cookies whatsoever and no user session.
  // If auth cookies exist (e.g. overnight sleep or expired access token), let the page load
  // so the client-side Supabase client can seamlessly refresh the token with zero interruption.
  if (!user && !hasAuthCookies && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If visitor is already confirmed authenticated and visits /login, redirect to /planner
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/planner', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/planner/:path*', '/journey/:path*', '/week/:path*', '/mistakes/:path*', '/profile/:path*', '/login'],
};
