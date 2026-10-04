'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateExam, getExamLinkedChapters, deleteExam } from '@/api/exams';
import type { ChapterOverview } from '@/api/chapters';
import type { ExamReadinessRow, ExamType } from '@/types/database.types';
import { Trash2, X } from 'lucide-react';

interface Props {
  userId: string;
  exam: ExamReadinessRow | null;
  chapters: ChapterOverview[];
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted?: (examId: string) => void;
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
  { value: 'other', label: 'Other Milestone' },
];

export function EditExamModal({ userId, exam, chapters, open, onClose, onUpdated, onDeleted }: Props) {
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<ExamType>('jee_main');
  const [examDate, setExamDate] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (exam && open) {
      setName(exam.name);
      setExamType(exam.exam_type);
      setExamDate(exam.exam_date);
      getExamLinkedChapters(exam.exam_id).then((chapIds) => {
        setSelectedChapters(new Set(chapIds));
      });
    }
  }, [exam, open]);

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
    if (!exam) return;
    if (!name.trim() || !examDate) {
      setError('Please provide a test name and date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateExam(userId, exam.exam_id, {
        name: name.trim(),
        examType,
        examDate,
        chapterIds: Array.from(selectedChapters),
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Could not save modifications.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!exam) return;
    try {
      await deleteExam(exam.exam_id);
      onDeleted?.(exam.exam_id);
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Could not remove test.');
    }
  }

  return (
    <AnimatePresence>
      {open && exam && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-ink-100 p-6 shadow-2xl"
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-paper">Edit Test & Milestone</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-paper/40 transition hover:bg-white/10 hover:text-paper"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-paper/50 uppercase tracking-wider">
                  Test Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-ink px-4 py-3 text-sm text-paper outline-none focus:border-amber/50"
                  placeholder="e.g. JEE Main Mock 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-paper/50 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-ink px-3 py-3 text-sm text-paper outline-none focus:border-amber/50"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as ExamType)}
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-ink text-paper">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-paper/50 uppercase tracking-wider">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-2xl border border-white/10 bg-ink px-3 py-3 text-sm text-paper outline-none focus:border-amber/50"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>
              </div>

              {chapters.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-paper/50">
                      Linked Syllabus
                    </label>
                    <span className="font-mono text-xs text-amber font-medium">
                      {selectedChapters.size} chapters linked
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-ink p-2 scrollbar-thin">
                    {Object.entries(bySubject).map(([subject, list]) => (
                      <div key={subject} className="mb-2.5">
                        <p className="px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-amber/80">
                          {subject}
                        </p>
                        {list.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs text-paper/80 hover:bg-white/5 cursor-pointer transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedChapters.has(c.id)}
                              onChange={() => toggleChapter(c.id)}
                              className="accent-amber rounded h-4 w-4"
                            />
                            <span className="truncate">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-rust font-medium">{error}</p>}

              <div className="mt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-rust/30 bg-rust/10 px-4 py-3 text-xs font-semibold text-rust transition hover:bg-rust/20 active:scale-95"
                  title="Remove this test"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-paper/60 transition hover:bg-white/10 hover:text-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-amber py-3 text-xs font-semibold text-ink shadow-md shadow-amber/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
