import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ['/planner', '/journey', '/week', '/mistakes', '/profile'];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/planner', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/planner/:path*', '/journey/:path*', '/week/:path*', '/mistakes/:path*', '/profile/:path*', '/login'],
};
