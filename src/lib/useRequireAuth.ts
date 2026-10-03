'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/AuthProvider';

/**
 * Use at the top of any protected page. Returns the same thing useAuth()
 * does, plus redirects to /login if auth resolves to "no user" — this is
 * a client-side backstop for cases like a session expiring while the tab
 * is already open. Middleware is the primary guard on navigation; this
 * covers the gap middleware can't (a page that's already mounted).
 */
export function useRequireAuth() {
  const { userId, user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !userId) {
      router.replace('/login');
    }
  }, [authLoading, userId, router]);

  return { userId, user, authLoading };
}
