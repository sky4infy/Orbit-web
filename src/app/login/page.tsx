'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push('/planner');
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <OrbitMark />
          <h1 className="font-display text-3xl font-medium">Orbit</h1>
          <p className="text-sm text-paper/60">
            {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              className="rounded-xl2 border border-white/10 bg-ink-100 px-4 py-3 text-sm outline-none placeholder:text-paper/30"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            className="rounded-xl2 border border-white/10 bg-ink-100 px-4 py-3 text-sm outline-none placeholder:text-paper/30"
            placeholder="Email"
            type="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl2 border border-white/10 bg-ink-100 px-4 py-3 text-sm outline-none placeholder:text-paper/30"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl2 bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-95 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          className="mt-5 w-full text-center text-sm text-paper/50 hover:text-paper/80"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </main>
  );
}

// Signature element: the orbit mark. A dot in steady orbit — the same
// motif used for the daily-completion ring on the planner screen.
function OrbitMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="15" stroke="#F0A868" strokeWidth="1.5" opacity="0.5" />
      <circle cx="20" cy="5" r="3" fill="#F0A868" />
    </svg>
  );
}
