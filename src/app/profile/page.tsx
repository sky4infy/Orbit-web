'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getDisplayName } from '@/api/profile';
import { getStreak, getLevelInfo, type LevelInfo } from '@/api/gamification';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState<LevelInfo | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      const [displayName, streakCount, levelInfo] = await Promise.all([
        getDisplayName(user.id),
        getStreak(user.id),
        getLevelInfo(user.id),
      ]);
      setName(displayName);
      setStreak(streakCount);
      setLevel(levelInfo);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-paper/40">Profile</p>
        <h1 className="font-display text-2xl font-medium">{name || 'Loading…'}</h1>
      </header>

      {level && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl2 border border-white/5 bg-ink-50 p-4">
            <p className="font-display text-2xl font-medium text-amber">{streak}</p>
            <p className="text-xs text-paper/40">day streak</p>
          </div>
          <div className="rounded-xl2 border border-white/5 bg-ink-50 p-4">
            <p className="font-display text-2xl font-medium">{level.level}</p>
            <p className="text-xs text-paper/40">level</p>
          </div>
        </div>
      )}

      <button
        onClick={signOut}
        className="mt-auto rounded-xl2 bg-white/5 px-4 py-3 text-sm font-semibold text-paper/70"
      >
        Sign out
      </button>
    </main>
  );
}
