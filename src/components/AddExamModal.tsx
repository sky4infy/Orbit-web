'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createExam } from '@/api/exams';
import type { ChapterOverview } from '@/api/chapters';
import type { ExamType } from '@/types/database.types';

interface Props {
  userId: string;
  chapters: ChapterOverview[];
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'nsep', label: 'NSEP (Physics Olympiad)' },
  { value: 'jee_main', label: 'JEE Main' },
  { value: 'jee_advanced', label: 'JEE Advanced' },
  { value: 'college_contest', label: 'Coding Contest (LeetCode / CF)' },
  { value: 'midsem', label: 'College Midsem / Semester Exam' },
  { value: 'hackathon', label: 'Hackathon / Project Sprint' },
  { value: 'coaching_test', label: 'Coaching Mock Test' },
  { value: 'school_test', label: 'School Test' },
  { value: 'iiser', label: 'IISER / IAT' },
  { value: 'other', label: 'Other' },
];

export function AddExamModal({ userId, chapters, open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<ExamType>('jee_main');
  const [examDate, setExamDate] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bySubject = useMemo(() => {
    const grouped: Record<string, ChapterOverview[]> = {};
    for (const c of chapters) {
      grouped[c.subjectName] ??= [];
      grouped[c.subjectName].push(c);
    }
    return grouped;
  }, [chapters]);

  function toggleChapter(id: string) {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !examDate) {
      setError('Give it a name and a date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createExam(userId, name.trim(), examType, examDate, Array.from(selectedChapters));
      setName('');
      setExamDate('');
      setSelectedChapters(new Set());
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-xl2 border border-white/10 bg-ink-100 p-5 sm:rounded-xl2"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-medium">Add a test</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-paper/30"
                placeholder="e.g. JEE Advanced 2027"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as ExamType)}
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>

              {chapters.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper/40">
                    Syllabus ({selectedChapters.size} selected)
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-xl2 border border-white/10 bg-ink p-2">
                    {Object.entries(bySubject).map(([subject, list]) => (
                      <div key={subject} className="mb-2">
                        <p className="px-2 py-1 text-[11px] font-semibold text-paper/40">{subject}</p>
                        {list.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={selectedChapters.has(c.id)}
                              onChange={() => toggleChapter(c.id)}
                              className="accent-amber"
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-rust">{error}</p>}

              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl2 bg-white/5 px-4 py-3 text-sm font-semibold text-paper/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl2 bg-amber px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add test'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
