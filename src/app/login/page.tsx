'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { OrbitLogo } from '@/components/OrbitLogo';
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
      setError("Authentication service temporarily unavailable. Please try again shortly.");
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
              track: focusTrack,
            },
          },
        });
        if (error) throw error;

        localStorage.setItem('orbit_active_track', focusTrack);

        if (data.session) {
          router.push('/planner');
          router.refresh();
        } else {
          setNotice(`Verification email sent to ${email}. Please check your inbox.`);
          setMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const userTrack = data.user?.user_metadata?.track;
        if (userTrack) {
          localStorage.setItem('orbit_active_track', userTrack);
        }

        router.push('/planner');
        router.refresh();
      }
    } catch (e: any) {
      const message: string = e?.message ?? 'An error occurred';
      if (/failed to fetch/i.test(message)) {
        setError("Network error. Please check your internet connection.");
      } else if (/email not confirmed/i.test(message)) {
        setError("Please verify your email address to log in. Check your inbox for the link.");
        setResendVisible(true);
      } else if (/invalid login credentials/i.test(message)) {
        setError("Incorrect email or password. Please try again.");
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
      setResendStatus('Verification email resent. Please check your inbox.');
    } catch (e: any) {
      setResendStatus(e?.message ?? 'Could not resend at this moment.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <OrbitLogo size={56} className="shadow-2xl rounded-2xl mb-1" />
          <h1 className="font-display text-3xl font-medium tracking-tight">Orbit</h1>
          <p className="text-sm text-paper/60">
            {mode === 'login' ? 'Sign in to your learning workspace' : 'Create your academic profile'}
          </p>
        </div>

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
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          className="mt-5 w-full text-center text-sm text-paper/50 hover:text-paper/80 transition"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
            setNotice(null);
          }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  );
}
