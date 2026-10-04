'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';
import { getChapterDetail, upsertChapterProgress } from '@/api/journey';
import { ensureRevisionExists } from '@/api/revisions';
import { useRequireAuth } from '@/lib/useRequireAuth';
import type { ChapterStatus, EventType } from '@/types/database.types';
import { getCurriculumChapters, computeConfidence, deleteChapter, saveChapterOverride } from '@/lib/curriculumData';

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
  task_moved: 'Moved a task to tomorrow',
  mistake_logged: 'Logged a mistake',
  revision_completed: 'Completed a revision',
};

export default function ChapterDetailPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useRouter();
  const { userId } = useRequireAuth();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getChapterDetail>> | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        if (userId) {
          const d = await getChapterDetail(userId, chapterId);
          if (d && d.status) {
            setDetail(d);
            setNotesDraft(d.status.notes ?? '');
            return;
          }
        }
        // Fallback to local curriculum catalog
        const match = getCurriculumChapters('all').find((c) => c.id === chapterId);
        if (match) {
          setDetail({
            status: {
              chapter_id: match.id,
              chapter_name: match.name,
              subject_id: match.subjectId,
              subject_name: match.subjectName,
              status: match.status,
              confidence_score: match.confidence,
              notes: 'Focus on core problem sets and key formula derivations.',
              last_revised_at: null,
              unresolved_mistakes: match.unresolvedMistakes,
            },
            mistakes: [],
            revision: null,
            todayEvents: [],
            recentTasks: [],
          });
          setNotesDraft('Focus on core problem sets and key formula derivations.');
        } else {
          setLoadError(true);
        }
      } catch (err) {
        console.error('Failed to load chapter detail, falling back:', err);
        const match = getCurriculumChapters('all').find((c) => c.id === chapterId);
        if (match) {
          setDetail({
            status: {
              chapter_id: match.id,
              chapter_name: match.name,
              subject_id: match.subjectId,
              subject_name: match.subjectName,
              status: match.status,
              confidence_score: match.confidence,
              notes: '',
              last_revised_at: null,
              unresolved_mistakes: match.unresolvedMistakes,
            },
            mistakes: [],
            revision: null,
            todayEvents: [],
            recentTasks: [],
          });
        } else {
          setLoadError(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [chapterId, userId]);

  async function setStatus(status: ChapterStatus) {
    if (!detail?.status) return;
    const unresolvedMistakes = detail.mistakes.filter((m) => !m.resolved).length || detail.status.unresolved_mistakes || 0;
    const newConfidence = computeConfidence(status, unresolvedMistakes);

    setDetail({
      ...detail,
      status: {
        ...detail.status,
        status,
        confidence_score: newConfidence,
      },
    });

    saveChapterOverride(chapterId, { status, confidence: newConfidence });

    if (userId) {
      await upsertChapterProgress(userId, chapterId, { status, confidence_score: newConfidence }).catch(() => {});
      if (status === 'revision_due') {
        await ensureRevisionExists(userId, chapterId).catch(() => {});
      }
    }
  }

  function handleExecuteRemove() {
    deleteChapter(chapterId);
    router.push('/journey');
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

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
        <p className="text-sm text-paper/40">Loading…</p>
      </main>
    );
  }

  if (loadError || !detail?.status) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-xs text-paper/40">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="rounded-xl2 border border-rust/30 bg-rust/10 p-4 text-sm text-rust">
          Could not load this chapter. Try again shortly.
        </div>
      </main>
    );
  }

  const { status, mistakes, revision, todayEvents } = detail;
  const unresolvedMistakesCount = mistakes.filter((m) => !m.resolved).length;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-xs text-paper/40 hover:text-paper transition">
          <ArrowLeft size={14} /> Back to Journey
        </button>

        {!isDeleting && (
          <button
            onClick={() => setIsDeleting(true)}
            className="flex items-center gap-1 text-xs text-rust/60 hover:text-rust transition"
            title="Remove from syllabus if added twice or by mistake"
          >
            <Trash2 size={13} />
            <span>Remove Chapter</span>
          </button>
        )}
      </div>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-amber font-mono">{status.subject_name}</p>
        <h1 className="font-display text-2xl font-medium text-paper mt-0.5">{status.chapter_name}</h1>
      </header>

      {/* Status selector */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">Mastery Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                status.status === s
                  ? 'bg-amber text-ink font-semibold shadow-sm'
                  : 'bg-white/5 text-paper/60 hover:bg-white/10'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Automated Confidence (Linked Directly to Status) */}
      <div className="mb-5 rounded-2xl border border-white/5 bg-ink-50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-amber" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-paper/70">Concept Confidence Score</p>
              <p className="text-[11px] text-paper/40 mt-0.5">
                Automatically calculated from {STATUS_LABEL[status.status]} status
                {unresolvedMistakesCount > 0 && ` (${unresolvedMistakesCount} unresolved mistake penalty)`}
              </p>
            </div>
          </div>
          <span className="font-mono text-xl font-bold text-amber">{status.confidence_score}%</span>
        </div>
      </div>

      {/* Today's activity */}
      {todayEvents.length > 0 && (
        <div className="mb-5 rounded-2xl border border-white/5 bg-ink-50 p-4">
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
        <div className="mb-5 rounded-2xl border border-white/5 bg-ink-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">Revision</p>
          <p className="text-sm text-paper/70">Next due {revision.due_date}</p>
          <p className="text-xs text-paper/40">
            {revision.success_count}/{revision.review_count} successful reviews
          </p>
        </div>
      )}

      {/* Mistakes */}
      <div className="mb-5 rounded-2xl border border-white/5 bg-ink-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">
          Mistakes ({unresolvedMistakesCount} open)
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
      <div className="mb-5 rounded-2xl border border-white/5 bg-ink-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">Notes</p>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Anything worth remembering about this chapter…"
          className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none placeholder:text-paper/20 focus:border-amber/40"
        />
        {savingNotes && <p className="mt-1 text-xs text-paper/30">Saving…</p>}
      </div>

      {/* Syllabus Management Zone */}
      <div className="mt-8 rounded-2xl border border-rust/20 bg-rust/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-rust">Syllabus Management</p>
        <p className="mt-1 text-xs text-paper/60">
          Not in your coaching / school exam syllabus, or was added twice by mistake?
        </p>
        {isDeleting ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleExecuteRemove}
              className="flex items-center gap-1.5 rounded-xl bg-rust px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rust/30 hover:brightness-110 active:scale-95 transition"
            >
              <Trash2 size={13} />
              <span>Confirm & Remove from Syllabus</span>
            </button>
            <button
              onClick={() => setIsDeleting(false)}
              className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-paper/60 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsDeleting(true)}
            className="mt-3 flex items-center gap-1.5 rounded-xl border border-rust/30 bg-rust/10 px-3.5 py-2 text-xs font-semibold text-rust hover:bg-rust/20 transition active:scale-95"
          >
            <Trash2 size={13} />
            <span>Remove Chapter from Syllabus</span>
          </button>
        )}
      </div>
    </main>
  );
}
