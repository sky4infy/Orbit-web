'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getChapterDetail, upsertChapterProgress } from '@/api/journey';
import type { ChapterStatus, EventType } from '@/types/database.types';

const STATUSES: ChapterStatus[] = ['not_started', 'learning', 'practicing', 'revision_due', 'mastered'];
const STATUS_LABEL: Record<ChapterStatus, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  practicing: 'Practicing',
  revision_due: 'Revision due',
  mastered: 'Mastered',
  locked: 'Locked',
};

const EVENT_LABEL: Partial<Record<EventType, string>> = {
  task_completed: 'Finished a task',
  task_skipped: 'Skipped a task',
  mistake_logged: 'Logged a mistake',
  revision_completed: 'Completed a revision',
};

export default function ChapterDetailPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getChapterDetail>> | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      setUserId(user.id);
      const d = await getChapterDetail(user.id, chapterId);
      setDetail(d);
      setNotesDraft(d.status?.notes ?? '');
      setLoading(false);
    })();
  }, [chapterId]);

  async function setStatus(status: ChapterStatus) {
    if (!userId || !detail?.status) return;
    setDetail({ ...detail, status: { ...detail.status, status } });
    await upsertChapterProgress(userId, chapterId, { status });
  }

  async function setConfidence(confidence_score: number) {
    if (!userId || !detail?.status) return;
    setDetail({ ...detail, status: { ...detail.status, confidence_score } });
    await upsertChapterProgress(userId, chapterId, { confidence_score });
  }

  async function saveNotes() {
    if (!userId) return;
    setSavingNotes(true);
    try {
      await upsertChapterProgress(userId, chapterId, { notes: notesDraft });
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading || !detail?.status) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
        <p className="text-sm text-paper/40">Loading…</p>
      </main>
    );
  }

  const { status, mistakes, revision, todayEvents } = detail;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-xs text-paper/40">
        <ArrowLeft size={14} /> Back
      </button>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-paper/40">{status.subject_name}</p>
        <h1 className="font-display text-2xl font-medium">{status.chapter_name}</h1>
      </header>

      {/* Status selector */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                status.status === s ? 'bg-amber text-ink' : 'bg-white/5 text-paper/60'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Confidence slider */}
      <div className="mb-5 rounded-xl2 border border-white/5 bg-ink-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-paper/40">Confidence</p>
          <span className="font-mono text-sm">{status.confidence_score}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={status.confidence_score}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="w-full accent-amber"
        />
      </div>

      {/* Today's activity */}
      {todayEvents.length > 0 && (
        <div className="mb-5 rounded-xl2 border border-white/5 bg-ink-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">Today</p>
          <div className="flex flex-col gap-1.5">
            {todayEvents.map((e, i) => (
              <p key={i} className="text-sm text-paper/70">
                ✓ {EVENT_LABEL[e.event_type as EventType] ?? e.event_type}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Revision */}
      {revision && (
        <div className="mb-5 rounded-xl2 border border-white/5 bg-ink-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">Revision</p>
          <p className="text-sm text-paper/70">Next due {revision.due_date}</p>
          <p className="text-xs text-paper/40">
            {revision.success_count}/{revision.review_count} successful reviews
          </p>
        </div>
      )}

      {/* Mistakes */}
      <div className="mb-5 rounded-xl2 border border-white/5 bg-ink-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">
          Mistakes ({mistakes.filter((m) => !m.resolved).length} open)
        </p>
        {mistakes.length === 0 ? (
          <p className="text-sm text-paper/30">None logged yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {mistakes.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className={m.resolved ? 'text-paper/30 line-through' : 'text-paper/80'}>
                  {m.mistake_type.replace('_', ' ')}
                </span>
                <span className="text-xs text-paper/30">{m.difficulty}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mb-5 rounded-xl2 border border-white/5 bg-ink-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">Notes</p>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Anything worth remembering about this chapter…"
          className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none placeholder:text-paper/20"
        />
        {savingNotes && <p className="mt-1 text-xs text-paper/30">Saving…</p>}
      </div>
    </main>
  );
}
