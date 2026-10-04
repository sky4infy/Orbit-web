'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { TrackType } from '@/types/database.types';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [focusTrack, setFocusTrack] = useState<TrackType>('jee_nsep');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendVisible, setResendVisible] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setResendVisible(false);

    if (!isSupabaseConfigured) {
      setError(
        "Supabase credentials are not configured in Vercel. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Environment Variables and redeploy."
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmation is off for this project — signUp already
          // logged them in, safe to go straight in.
          router.push('/planner');
          router.refresh();
        } else {
          // Most Supabase projects have "Confirm email" on by default.
          // signUp() still succeeds and creates the user, but returns no
          // session until they click the link in their inbox. Redirecting
          // to a protected page here would just get silently bounced back
          // to /login by middleware with zero explanation — so instead,
          // tell them plainly what to do next.
          setNotice(`Confirmation link sent to ${email}. Please check your inbox.`);
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/planner');
        router.refresh();
      }
    } catch (e: any) {
      const message: string = e?.message ?? 'Something went wrong';
      if (/failed to fetch/i.test(message)) {
        setError(
          "Could not reach database (Failed to fetch). If you are running on Vercel, ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Project Settings and redeployed."
        );
      } else if (/email not confirmed/i.test(message)) {
        setError("This email hasn't been confirmed yet — check your inbox for the confirmation link.");
        setResendVisible(true);
      } else if (/invalid login credentials/i.test(message)) {
        setError(
          "Email or password doesn't match an account. If you just signed up, make sure you confirmed your email first — or double check you're using the right password."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setResendStatus(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResendStatus('Confirmation email resent — check your inbox.');
    } catch (e: any) {
      setResendStatus(e?.message ?? 'Could not resend right now.');
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

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-2xl border border-amber/30 bg-amber/10 p-3.5 text-xs text-amber leading-relaxed">
            <p className="font-semibold text-amber mb-1 flex items-center gap-1.5">
              <span>⚠️</span> Supabase Not Linked in Vercel
            </p>
            <p className="text-paper/70">
              Add <code className="text-amber bg-white/5 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-amber bg-white/5 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your Vercel Project Settings and redeploy.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <>
              <input
                className="rounded-xl2 border border-white/10 bg-ink-100 px-4 py-3 text-sm outline-none placeholder:text-paper/30"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div className="rounded-xl2 border border-white/5 bg-ink-100/50 p-3">
                <label className="text-[11px] font-medium uppercase tracking-wider text-paper/40 mb-2 block">
                  Select Your Primary Academic Focus
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusTrack('jee_nsep');
                      localStorage.setItem('orbit_active_track', 'jee_nsep');
                    }}
                    className={`rounded-xl p-2.5 text-left transition ${
                      focusTrack === 'jee_nsep'
                        ? 'border border-amber bg-amber/15 text-paper'
                        : 'border border-white/5 bg-white/5 text-paper/60 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-xs font-semibold">STEM & Olympiad</p>
                    <p className="text-[10px] text-paper/40 mt-0.5">JEE Main • Adv • NSEP</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFocusTrack('college_cs_aiml');
                      localStorage.setItem('orbit_active_track', 'college_cs_aiml');
                    }}
                    className={`rounded-xl p-2.5 text-left transition ${
                      focusTrack === 'college_cs_aiml'
                        ? 'border border-subject-physics bg-subject-physics/15 text-paper'
                        : 'border border-white/5 bg-white/5 text-paper/60 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-xs font-semibold">CS & AI</p>
                    <p className="text-[10px] text-paper/40 mt-0.5">DSA • AI/ML • Systems</p>
                  </button>
                </div>
              </div>
            </>
          )}
          <input
            className="rounded-xl2 border border-white/10 bg-ink-100 px-4 py-3 text-sm outline-none placeholder:text-paper/30"
            placeholder="Email"
            type="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              className="w-full rounded-xl2 border border-white/10 bg-ink-100 px-4 py-3 pr-11 text-sm outline-none placeholder:text-paper/30 transition focus:border-amber/50"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-paper/40 transition hover:text-paper/80"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {notice && (
            <p className="rounded-xl2 border border-amber/30 bg-amber/10 p-3 text-xs text-amber">{notice}</p>
          )}

          {error && (
            <div>
              <p className="text-sm text-rust">{error}</p>
              {resendVisible && (
                <button
                  type="button"
                  onClick={resendConfirmation}
                  className="mt-1 text-xs text-paper/50 underline hover:text-paper/80"
                >
                  Resend confirmation email
                </button>
              )}
              {resendStatus && <p className="mt-1 text-xs text-paper/40">{resendStatus}</p>}
            </div>
          )}

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
