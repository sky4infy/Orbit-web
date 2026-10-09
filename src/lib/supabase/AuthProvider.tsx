'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthContextValue {
  user: User | null;
  userId: string | null;
  /**
   * True until the first real auth state is known. Use this — not
   * `!userId` — to tell "still checking" apart from "confirmed logged
   * out".
   */
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userId: null,
  authLoading: true,
});

const CACHED_USER_KEY = 'orbit_cached_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Instantly check localStorage for cached user session to prevent login-screen flash
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHED_USER_KEY);
        if (cached) {
          const parsedUser = JSON.parse(cached);
          if (parsedUser && parsedUser.id) {
            setUser(parsedUser);
          }
        }
      } catch {}
    }

    // 2. Proactively restore session from Supabase client (handles refresh token exchange)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(session.user));
        } catch {}
        setAuthLoading(false);
      } else if (!error) {
        // If Supabase confirms there is no session and no cached user
        const hasCached = typeof window !== 'undefined' && localStorage.getItem(CACHED_USER_KEY);
        if (!hasCached) {
          setUser(null);
        }
        setAuthLoading(false);
      }
    }).catch(() => {
      if (isMounted) setAuthLoading(false);
    });

    // 3. Listen to auth changes (TOKEN_REFRESHED, SIGNED_IN, SIGNED_OUT)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        try {
          localStorage.removeItem(CACHED_USER_KEY);
        } catch {}
        setAuthLoading(false);
      } else if (session?.user) {
        setUser(session.user);
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(session.user));
        } catch {}
        setAuthLoading(false);
      }
    });

    // Fallback safety timeout (3500ms): only marks loading complete if network was unresponsive,
    // preserving any cached user session so offline students never get abruptly logged out.
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setAuthLoading(false);
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userId: user?.id ?? null, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
