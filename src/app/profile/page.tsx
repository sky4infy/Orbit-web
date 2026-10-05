'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { getDisplayName } from '@/api/profile';
import { getStreak, getLevelInfo, type LevelInfo } from '@/api/gamification';
import { useRequireAuth } from '@/lib/useRequireAuth';
import type { TrackType } from '@/types/database.types';
import { Sparkles, Code2, Check, User, Users, Flame, Trophy, Shield, LogOut, Database, Download, Upload } from 'lucide-react';
import { getOrbitStats, exportOrbitBackupJSON, importOrbitBackupJSON } from '@/lib/db';

function withTimeout<T>(promise: Promise<T>, ms = 800): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);
}

export default function ProfilePage() {
  const { userId, user, authLoading } = useRequireAuth();
  const [name, setName] = useState('Student');
  const [streak, setStreak] = useState(1);
  const [level, setLevel] = useState<LevelInfo | null>({ level: 1, xp: 40, xpIntoLevel: 40, xpForNextLevel: 50 });
  const [activeTrack, setActiveTrack] = useState<TrackType>('jee_nsep');
  const [partnerName, setPartnerName] = useState('Study Partner');
  const [loading, setLoading] = useState(false);
  const [dbStats, setDbStats] = useState({ tasks: 0, mistakes: 0, exams: 0 });
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.track) {
      const uTrack = user.user_metadata.track as TrackType;
      setActiveTrack(uTrack);
      localStorage.setItem('orbit_active_track', uTrack);
    } else {
      const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
      if (saved) setActiveTrack(saved);
    }

    const savedPartner = localStorage.getItem('orbit_partner_name');
    if (savedPartner) setPartnerName(savedPartner);

    getOrbitStats().then(setDbStats).catch(() => {});
  }, [user]);

  async function handleExportBackup() {
    try {
      const jsonStr = await exportOrbitBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orbit-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccess('Snapshot exported successfully!');
      setTimeout(() => setBackupSuccess(null), 3000);
    } catch {
      alert('Could not export backup snapshot.');
    }
  }

  function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const ok = await importOrbitBackupJSON(content);
      if (ok) {
        setBackupSuccess('Data restored successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        alert('Invalid backup file. Please select an Orbit JSON backup file.');
      }
    };
    reader.readAsText(file);
  }

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    Promise.allSettled([
      withTimeout(getDisplayName(userId), 800),
      withTimeout(getStreak(userId), 800),
      withTimeout(getLevelInfo(userId), 800),
    ]).then(([nameRes, streakRes, levelRes]) => {
      if (!isMounted) return;
      if (nameRes.status === 'fulfilled' && nameRes.value) setName(nameRes.value);
      if (streakRes.status === 'fulfilled') setStreak(streakRes.value);
      if (levelRes.status === 'fulfilled') setLevel(levelRes.value);
    }).catch(() => {
      // Keep eager values
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  function handlePartnerNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPartnerName(val);
    localStorage.setItem('orbit_partner_name', val);
  }

  async function signOut() {
    document.cookie = 'orbit_demo=; path=/; max-age=0';
    localStorage.removeItem('orbit_demo');
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignored
    }
    window.location.href = '/login';
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-32 pt-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-paper/40">Account & Preferences</p>
          <h1 className="font-display text-2xl font-semibold text-paper">
            {loading ? 'Loading…' : name}
          </h1>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber/15 text-amber ring-1 ring-amber/30">
          <User size={20} />
        </div>
      </header>

      {/* Gamification Stats */}
      {level && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-ink-50 p-4">
            <div className="flex items-center gap-1.5 text-xs text-paper/40 mb-1">
              <Flame size={14} className="text-amber" />
              <span>Day Streak</span>
            </div>
            <p className="font-display text-2xl font-semibold text-amber">{streak} days</p>
            <p className="text-[11px] text-paper/30 mt-0.5">Consecutive orbit</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-ink-50 p-4">
            <div className="flex items-center gap-1.5 text-xs text-paper/40 mb-1">
              <Trophy size={14} className="text-sage" />
              <span>Mastery Level</span>
            </div>
            <p className="font-display text-2xl font-semibold text-paper">Level {level.level}</p>
            <p className="text-[11px] text-paper/30 mt-0.5">
              {level.xpIntoLevel} / {level.xpForNextLevel} XP to Level {level.level + 1}
            </p>
          </div>
        </div>
      )}

      {/* Primary Academic Focus Track (Configured at Signup) */}
      <section className="mb-6 rounded-3xl border border-white/10 bg-ink-50 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-paper flex items-center gap-1.5">
              <Shield size={16} className="text-amber" /> Primary Academic Focus
            </h2>
            <p className="text-xs text-paper/50 mt-0.5">
              Configured during signup. Your syllabus, planner, and AI mentor are calibrated to this path.
            </p>
          </div>
          <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[10px] font-medium text-amber">
            {activeTrack === 'jee_nsep' ? 'STEM • JEE' : 'CS & AI'}
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-white/5 bg-ink/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-amber">
                {activeTrack === 'jee_nsep' ? <Sparkles size={18} /> : <Code2 size={18} />}
              </div>
              <div>
                <p className="text-xs font-semibold text-paper">
                  {activeTrack === 'jee_nsep'
                    ? 'STEM & Olympiad (JEE Main • Advanced • NSEP)'
                    : 'Computer Science & AI / ML Track'}
                </p>
                <p className="text-[11px] text-paper/40 mt-0.5">
                  {activeTrack === 'jee_nsep'
                    ? 'Physics • Chemistry • Mathematics'
                    : 'Data Structures • Algorithms • Machine Learning • Web Systems'}
                </p>
              </div>
            </div>

            {/* In case user accidentally switched to JEE and wants their CS & AI track back */}
            {activeTrack === 'jee_nsep' && (
              <button
                type="button"
                onClick={async () => {
                  setActiveTrack('college_cs_aiml');
                  localStorage.setItem('orbit_active_track', 'college_cs_aiml');
                  try {
                    await supabase.auth.updateUser({ data: { track: 'college_cs_aiml' } });
                  } catch {}
                  window.location.href = '/journey';
                }}
                className="rounded-xl border border-amber/30 bg-amber/15 px-3 py-1.5 text-xs font-semibold text-amber transition hover:bg-amber/25 active:scale-95 shrink-0 ml-3"
                title="Restore your Computer Science & AI track"
              >
                Revert to CS & AI
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Study Partner & Accountability Circle */}
      <section className="mb-6 rounded-3xl border border-white/10 bg-ink-50 p-5">
        <h2 className="text-sm font-semibold text-paper flex items-center gap-1.5 mb-1">
          <Users size={16} className="text-subject-physics" /> Study Partner & Circle
        </h2>
        <p className="text-xs text-paper/50 mb-3">Connect your accountability circle for mutual focus streaks</p>

        <div className="rounded-2xl border border-white/5 bg-ink/40 p-3.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-paper/40 mb-1.5 block">
            Partner Display Name
          </label>
          <input
            type="text"
            value={partnerName}
            onChange={handlePartnerNameChange}
            placeholder="e.g. Study Partner, Aarav, Ananya…"
            className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-xs text-paper placeholder-paper/30 focus:border-amber focus:outline-none"
          />
        </div>
      </section>

      {/* Local-First Database & Cloud Backup (Approach 1) */}
      <section className="mb-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Database size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-paper">Local-First Database Engine</h2>
              <p className="text-[11px] text-emerald-400 font-medium">Zero-Latency Engine • 0ms Latency • Cloud Synced</p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            IndexedDB
          </span>
        </div>

        <p className="text-xs text-paper/60 leading-relaxed mt-2 mb-4">
          All your daily missions, mistake vault logs, and syllabus progress are stored locally on your device in browser IndexedDB. Your data remains 100% accessible even when offline or if cloud databases pause.
        </p>

        {/* Database Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="rounded-xl border border-white/5 bg-ink/40 p-2.5">
            <p className="font-mono text-base font-bold text-amber">{dbStats.tasks}</p>
            <p className="text-[10px] text-paper/40 uppercase">Missions</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-ink/40 p-2.5">
            <p className="font-mono text-base font-bold text-rust">{dbStats.mistakes}</p>
            <p className="text-[10px] text-paper/40 uppercase">Mistakes</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-ink/40 p-2.5">
            <p className="font-mono text-base font-bold text-emerald-400">{dbStats.exams}</p>
            <p className="text-[10px] text-paper/40 uppercase">Exams</p>
          </div>
        </div>

        {/* Action Buttons: Export & Restore */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-paper hover:bg-white/10 active:scale-95 transition"
          >
            <Download size={14} className="text-amber" />
            <span>Export Full Backup (.json)</span>
          </button>

          <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-ink/30 py-2.5 text-xs font-medium text-paper/60 hover:border-amber/40 hover:text-paper cursor-pointer active:scale-95 transition">
            <Upload size={14} className="text-paper/40" />
            <span>Restore from Backup File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        {backupSuccess && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-400">
            <Check size={13} />
            <span>{backupSuccess}</span>
          </div>
        )}
      </section>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-xs font-semibold text-paper/70 transition hover:bg-rust/20 hover:text-rust hover:border-rust/30"
      >
        <LogOut size={14} />
        <span>Sign out</span>
      </button>
    </main>
  );
}
