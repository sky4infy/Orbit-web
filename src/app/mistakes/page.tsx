'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getMistakesList, resolveMistake, type MistakeRow } from '@/api/mistakes';
import { getChaptersOverview, type ChapterOverview } from '@/api/chapters';
import { getDueRevisions, type DueRevisionRow } from '@/api/revisions';
import { MistakeCard } from '@/components/MistakeCard';
import { LogMistakeModal } from '@/components/LogMistakeModal';
import { RevisionSession } from '@/components/RevisionSession';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getCurriculumChapters } from '@/lib/curriculumData';
import type { TrackType } from '@/types/database.types';

function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);
}

const getFallbackMistakes = (activeTrack: TrackType): MistakeRow[] => {
  const now = new Date().toISOString();
  if (activeTrack === 'jee_nsep') {
    return [
      {
        id: 'mistake-jee-1',
        chapter_id: 'jee-phy-6',
        mistake_type: 'conceptual',
        difficulty: 'hard',
        description: 'Forgot torque about instantaneous center of zero velocity (ICOR) in inclined rolling cylinder problem.',
        resolved: false,
        created_at: now,
        chapter_name: 'Rotational Dynamics & Angular Momentum (NSEP)',
        subject_name: 'Physics',
      },
      {
        id: 'mistake-jee-2',
        chapter_id: 'jee-chm-3',
        mistake_type: 'calculation',
        difficulty: 'medium',
        description: 'Slipped on bond order of O2+ vs O2- using Molecular Orbital Theory diagram.',
        resolved: false,
        created_at: now,
        chapter_name: 'Chemical Bonding & Molecular Structure',
        subject_name: 'Chemistry',
      },
      {
        id: 'mistake-jee-3',
        chapter_id: 'jee-phy-3',
        mistake_type: 'silly',
        difficulty: 'easy',
        description: 'Substituted g = 10 instead of g = 9.8 in NSEP Section B decimal question.',
        resolved: true,
        created_at: now,
        chapter_name: 'Kinematics: 1D & 2D Projectiles',
        subject_name: 'Physics',
      },
    ];
  }
  return [
    {
      id: 'mistake-cs-1',
      chapter_id: 'cs-dsa-7',
      mistake_type: 'logic_flaw',
      difficulty: 'hard',
      description: '0/1 Knapsack: Inner loop ran forward instead of backward for 1D space optimization, reusing item.',
      resolved: false,
      created_at: now,
      chapter_name: 'Dynamic Programming: 1D & Knapsack',
      subject_name: 'Data Structures & Algorithms',
    },
    {
      id: 'mistake-cs-2',
      chapter_id: 'cs-dsa-2',
      mistake_type: 'corner_case',
      difficulty: 'medium',
      description: 'Integer overflow in binary search: used (low + high) / 2 instead of low + (high - low) / 2.',
      resolved: false,
      created_at: now,
      chapter_name: 'Binary Search & Search on Answer',
      subject_name: 'Data Structures & Algorithms',
    },
    {
      id: 'mistake-cs-3',
      chapter_id: 'cs-ml-7',
      mistake_type: 'conceptual',
      difficulty: 'hard',
      description: 'Forgot scaling factor 1 / sqrt(d_k) in self-attention calculation causing vanishing softmax gradient.',
      resolved: true,
      created_at: now,
      chapter_name: 'Transformers: Self-Attention & Encoders',
      subject_name: 'AI & Machine Learning',
    },
  ];
};

const getFallbackRevisions = (activeTrack: TrackType): DueRevisionRow[] => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (activeTrack === 'jee_nsep') {
    return [
      {
        id: 'rev-jee-1',
        chapter_id: 'jee-phy-6',
        due_date: today,
        interval_days: 3,
        review_count: 2,
        success_count: 1,
        failure_count: 1,
        chapter_name: 'Rotational Dynamics & Angular Momentum (NSEP)',
        subject_name: 'Physics',
      },
    ];
  }
  return [
    {
      id: 'rev-cs-1',
      chapter_id: 'cs-dsa-7',
      due_date: today,
      interval_days: 3,
      review_count: 2,
      success_count: 1,
      failure_count: 1,
      chapter_name: 'Dynamic Programming: 1D & Knapsack',
      subject_name: 'Data Structures & Algorithms',
    },
  ];
};

export default function MistakesPage() {
  const { userId, authLoading } = useRequireAuth();

  const initialTrack: TrackType = typeof window !== 'undefined'
    ? ((localStorage.getItem('orbit_active_track') as TrackType) || 'college_cs_aiml')
    : 'college_cs_aiml';

  const [track, setTrack] = useState<TrackType>(() => initialTrack);

  // Eager initialization — empty for auth users, never flash sample errors
  const [mistakes, setMistakes] = useState<MistakeRow[]>([]);
  const [chapters, setChapters] = useState<ChapterOverview[]>(() =>
    getCurriculumChapters(initialTrack).map((c) => ({
      id: c.id,
      name: c.name,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      confidence: c.confidence,
      status: c.status,
      unresolvedMistakes: c.unresolvedMistakes,
    }))
  );
  const [dueRevisions, setDueRevisions] = useState<DueRevisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);

  // Read track preference once
  useEffect(() => {
    const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
    if (saved && saved !== track) {
      setTrack(saved);
      setChapters(
        getCurriculumChapters(saved).map((c) => ({
          id: c.id,
          name: c.name,
          subjectId: c.subjectId,
          subjectName: c.subjectName,
          confidence: c.confidence,
          status: c.status,
          unresolvedMistakes: c.unresolvedMistakes,
        }))
      );
    }
  }, [track]);

  // Background sync with timeout protection
  const load = useCallback(
    async (uid: string, activeTrack = track) => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const results = await Promise.allSettled([
          withTimeout(getMistakesList(uid), 6000),
          withTimeout(getChaptersOverview(activeTrack), 6000),
          withTimeout(getDueRevisions(uid, today, activeTrack), 6000),
        ]);
        const [mistakeRes, chapterRes, revisionRes] = results;

        if (mistakeRes.status === 'fulfilled') {
          setMistakes(mistakeRes.value);
        } else if (!uid) {
          setMistakes(getFallbackMistakes(activeTrack));
        }

        if (chapterRes.status === 'fulfilled' && chapterRes.value.length > 0) {
          setChapters(chapterRes.value);
        }

        if (revisionRes.status === 'fulfilled') {
          setDueRevisions(revisionRes.value);
        } else if (!uid) {
          setDueRevisions(getFallbackRevisions(activeTrack));
        }
      } catch {
        if (!uid) {
          setMistakes(getFallbackMistakes(activeTrack));
          setDueRevisions(getFallbackRevisions(activeTrack));
        }
      }
    },
    [track]
  );

  useEffect(() => {
    if (userId) {
      load(userId, track);
    } else if (!authLoading) {
      load('', track);
    }
  }, [userId, authLoading, load, track]);

  const refresh = useCallback(() => {
    if (userId) load(userId, track);
  }, [userId, load, track]);

  async function handleResolve(id: string) {
    setMistakes((prev) => prev.map((m) => (m.id === id ? { ...m, resolved: true } : m)));
    if (userId) {
      try {
        await resolveMistake(id);
      } catch {
        // Ignored
      }
    }
  }

  const unresolvedCount = mistakes.filter((m) => !m.resolved).length;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-32 pt-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-paper/40">Active Recall & Error Vault</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="font-display text-2xl font-semibold text-paper">Mistakes & Revision</h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-amber">
              {track === 'jee_nsep' ? 'STEM • JEE' : 'CS & AI'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setLogOpen(true)}
          className="rounded-xl bg-amber px-3.5 py-2 text-xs font-semibold text-ink shadow-md shadow-amber/20 hover:brightness-110 active:scale-95 transition"
        >
          + Log Mistake
        </button>
      </header>

      {/* Spaced Revision Queue Banner */}
      {dueRevisions.length > 0 && (
        <div className="mb-6 rounded-2xl border border-rust/30 bg-rust/10 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rust uppercase tracking-wider font-mono">
                Spaced Revision Ladder
              </p>
              <h2 className="mt-0.5 font-display text-base font-medium text-paper">
                {dueRevisions.length} revision(s) due today
              </h2>
              <p className="text-[11px] text-paper/40">Interval: 1 / 3 / 7 / 16 / 35 days</p>
            </div>
            <button
              onClick={() => setRevisionOpen(true)}
              className="rounded-xl bg-rust px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition"
            >
              Start Session
            </button>
          </div>
        </div>
      )}

      {/* Unresolved Mistakes Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-paper/40">
            Open Mistakes ({unresolvedCount})
          </h2>
          <span className="text-[11px] text-paper/30 font-mono">Turn friction into mastery</span>
        </div>

        {unresolvedCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-paper/40">
            No open mistakes logged. Good work staying on trajectory.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mistakes
              .filter((m) => !m.resolved)
              .map((m) => (
                <MistakeCard key={m.id} mistake={m} onResolve={() => handleResolve(m.id)} />
              ))}
          </div>
        )}
      </section>

      {/* Resolved Archive Section */}
      {mistakes.some((m) => m.resolved) && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-paper/40">
              Resolved Knowledge ({mistakes.filter((m) => m.resolved).length})
            </h2>
          </div>
          <div className="flex flex-col gap-2.5 opacity-60">
            {mistakes
              .filter((m) => m.resolved)
              .map((m) => (
                <MistakeCard key={m.id} mistake={m} onResolve={() => {}} />
              ))}
          </div>
        </section>
      )}

      {/* Log Mistake Modal */}
      <LogMistakeModal
        userId={userId ?? 'local-user'}
        chapters={chapters}
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onCreated={refresh}
      />

      {/* Revision Session Modal */}
      {revisionOpen && (
        <RevisionSession
          userId={userId ?? 'local-user'}
          queue={dueRevisions}
          onClose={() => setRevisionOpen(false)}
          onFinished={refresh}
        />
      )}
    </main>
  );
}
