import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const track = requestUrl.searchParams.get('track');
  const next = requestUrl.searchParams.get('next') ?? '/planner';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // If a track was passed from the login page, update user metadata
      if (track) {
        await supabase.auth.updateUser({
          data: { track },
        });
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Fallback if oauth fails
  return NextResponse.redirect(new URL('/login?error=oauth_error', requestUrl.origin));
}
