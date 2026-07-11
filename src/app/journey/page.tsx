'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSubjectProgress, getChaptersForSubject } from '@/api/journey';
import type { SubjectProgressRow, ChapterStatusRow, ChapterStatus } from '@/types/database.types';

const STATUS_META: Record<ChapterStatus, { label: string; color: string }> = {
  not_started: { label: 'Not started', color: 'bg-white/20' },
  learning: { label: 'Learning', color: 'bg-subject-physics' },
  practicing: { label: 'Practicing', color: 'bg-subject-maths' },
  revision_due: { label: 'Revision due', color: 'bg-rust' },
  mastered: { label: 'Mastered', color: 'bg-sage' },
  locked: { label: 'Locked', color: 'bg-white/10' },
};

export default function JourneyPage() {
  const [subjects, setSubjects] = useState<SubjectProgressRow[]>([]);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, ChapterStatusRow[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjectProgress()
      .then(setSubjects)
      .finally(() => setLoading(false));
  }, []);

  async function toggleSubject(subjectId: string) {
    if (openSubject === subjectId) {
      setOpenSubject(null);
      return;
    }
    setOpenSubject(subjectId);
    if (!chaptersBySubject[subjectId]) {
      const rows = await getChaptersForSubject(subjectId);
      setChaptersBySubject((prev) => ({ ...prev, [subjectId]: rows }));
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-paper/40">Your syllabus</p>
        <h1 className="font-display text-2xl font-medium">Journey</h1>
      </header>

      {loading ? (
        <p className="text-sm text-paper/40">Loading…</p>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-white/10 p-8 text-center text-sm text-paper/40">
          No subjects seeded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {subjects.map((s) => {
            const isOpen = openSubject === s.subject_id;
            const pct = s.total_chapters > 0 ? (s.mastered_count / s.total_chapters) * 100 : 0;
            return (
              <div key={s.subject_id} className="rounded-xl2 border border-white/5 bg-ink-50 p-4">
                <button onClick={() => toggleSubject(s.subject_id)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{s.subject_name}</span>
                    <span className="font-mono text-xs text-paper/40">
                      {s.mastered_count}/{s.total_chapters} mastered
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
                  </div>
                  {s.revision_due_count > 0 && (
                    <p className="mt-1.5 text-xs text-rust">{s.revision_due_count} chapter(s) need revision</p>
                  )}
                </button>

                {isOpen && (
                  <div className="mt-3 flex flex-col gap-1 border-t border-white/5 pt-3">
                    {(chaptersBySubject[s.subject_id] ?? []).map((c) => (
                      <Link
                        key={c.chapter_id}
                        href={`/journey/${c.chapter_id}`}
                        className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${STATUS_META[c.status].color}`} />
                          <span className="text-sm">{c.chapter_name}</span>
                        </div>
                        <span className="text-xs text-paper/30">{STATUS_META[c.status].label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
