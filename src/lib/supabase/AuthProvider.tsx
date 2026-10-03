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
   * out". A page that treats those two the same shows broken/empty UI
   * during the brief window before the session finishes loading.
   */
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userId: null,
  authLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const hasDemoCookie = typeof document !== 'undefined' && document.cookie.includes('orbit_demo=true');
    const hasDemoLocal = typeof window !== 'undefined' && localStorage.getItem('orbit_demo') === 'true';
    if (hasDemoCookie || hasDemoLocal) {
      setUser({ id: 'demo-user-1', email: 'demo@orbit.app' } as unknown as User);
      setAuthLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 400);

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        clearTimeout(timer);
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });
      return () => {
        clearTimeout(timer);
        sub.subscription.unsubscribe();
      };
    } catch {
      clearTimeout(timer);
      setAuthLoading(false);
    }
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
