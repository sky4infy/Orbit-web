'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Layers } from 'lucide-react';
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
  { value: 'other', label: 'Other Milestone' },
];

export function AddExamModal({ userId, chapters, open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<ExamType>('midsem');
  const [examDate, setExamDate] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('');
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userManuallyPickedSubject = useRef(false);

  // Group chapters by subject
  const bySubject = useMemo(() => {
    const grouped: Record<string, ChapterOverview[]> = {};
    for (const c of chapters) {
      grouped[c.subjectName] ??= [];
      grouped[c.subjectName].push(c);
    }
    return grouped;
  }, [chapters]);

  const availableSubjects = useMemo(() => {
    return Object.keys(bySubject);
  }, [bySubject]);

  // Derive the active subject: MUST be in selectedSubjects
  const currentSub = useMemo(() => {
    if (selectedSubjects.size === 0) return '';
    if (activeSubjectTab && selectedSubjects.has(activeSubjectTab)) {
      return activeSubjectTab;
    }
    return Array.from(selectedSubjects)[0] || '';
  }, [selectedSubjects, activeSubjectTab]);

  useEffect(() => {
    if (open) {
      userManuallyPickedSubject.current = false;
    }
  }, [open]);

  // Auto-detect subject only on high-confidence match from typed test name
  useEffect(() => {
    if (userManuallyPickedSubject.current || selectedSubjects.size > 0) return;
    const trimmed = name.trim().toLowerCase();
    if (trimmed.length < 2) return;

    for (const sub of availableSubjects) {
      const cleanSub = sub.toLowerCase();
      // Match if test name contains the subject or prominent word tokens
      const words = cleanSub.split(/[\s&/_-]+/).filter((w) => w.length >= 3 && w !== 'college' && w !== 'subject');
      const nameWords = trimmed.split(/[\s&/_-]+/);
      const hasExactWord = words.some((w) => nameWords.includes(w));
      const isSubInName = trimmed.includes(cleanSub);

      if (isSubInName || hasExactWord) {
        setSelectedSubjects(new Set([sub]));
        setActiveSubjectTab(sub);
        break;
      }
    }
  }, [name, availableSubjects, selectedSubjects.size]);

  // Toggle subject selection
  function toggleSubject(sub: string) {
    userManuallyPickedSubject.current = true;
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) {
        next.delete(sub);
        // Also remove chapters of this subject from selectedChapters
        const subChaps = bySubject[sub] || [];
        const chapsToRemove = new Set(subChaps.map((c) => c.id));
        setSelectedChapters((prevChaps) => {
          const updated = new Set(prevChaps);
          chapsToRemove.forEach((id) => updated.delete(id));
          return updated;
        });
        if (activeSubjectTab === sub) {
          const remaining = Array.from(next);
          setActiveSubjectTab(remaining[0] || '');
        }
      } else {
        next.add(sub);
        setActiveSubjectTab(sub);
      }
      return next;
    });
  }

  // Toggle individual chapter
  function toggleChapter(id: string) {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Select all chapters for active subject
  function selectAllInSubject(sub: string) {
    const subChaps = bySubject[sub] || [];
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      subChaps.forEach((c) => next.add(c.id));
      return next;
    });
  }

  // Clear all chapters for active subject
  function clearAllInSubject(sub: string) {
    const subChaps = bySubject[sub] || [];
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      subChaps.forEach((c) => next.delete(c.id));
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !examDate) {
      setError('Please provide a test name and date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createExam(userId, name.trim(), examType, examDate, Array.from(selectedChapters));
      setName('');
      setExamDate('');
      setSelectedSubjects(new Set());
      setSelectedChapters(new Set());
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Could not save test.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[90vh] w-full max-w-lg flex flex-col rounded-3xl border border-white/10 bg-ink-100 shadow-2xl overflow-hidden"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-medium text-paper">Create a Test / Milestone</h2>
                <p className="text-[11px] text-paper/40">Select subjects first, then pick specific syllabus chapters</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-paper/40 hover:bg-white/5 hover:text-paper transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Test Name */}
              <div>
                <label className="text-xs text-paper/50">Test Name</label>
                <input
                  autoFocus
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-ink px-4 py-3 text-sm text-paper outline-none placeholder:text-paper/20 focus:border-amber"
                  placeholder="e.g. COA Midsem Exam or JEE Main Mock 4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Type & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-paper/50">Category</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-ink px-3 py-2.5 text-xs text-paper outline-none focus:border-amber"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as ExamType)}
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-paper/50">Exam Date</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-ink px-3 py-2.5 text-xs text-paper outline-none focus:border-amber"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Step 1: Choose Subject(s) in this Test */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-paper/60 flex items-center gap-1.5">
                    <Layers size={13} className="text-amber" />
                    <span>Choose Subject(s) in this Test</span>
                  </label>
                  <span className="text-[11px] text-paper/40">
                    {selectedSubjects.size > 0 ? `${selectedSubjects.size} selected` : 'Tap to select'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {availableSubjects.map((sub) => {
                    const isSel = selectedSubjects.has(sub);
                    const isActive = isSel && currentSub === sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          if (!isSel) {
                            toggleSubject(sub);
                          } else if (isActive) {
                            toggleSubject(sub);
                          } else {
                            setActiveSubjectTab(sub);
                          }
                        }}
                        className={`group flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? 'bg-amber text-ink font-semibold shadow-sm ring-1 ring-amber/50'
                            : isSel
                            ? 'bg-amber/20 border border-amber/40 text-amber font-medium hover:bg-amber/30'
                            : 'border border-white/10 bg-ink text-paper/60 hover:text-paper hover:bg-white/5'
                        }`}
                      >
                        <span>{isSel ? '✓ ' : '+ '}</span>
                        <span>{sub}</span>
                        {isSel && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubject(sub);
                            }}
                            className={`ml-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none transition ${
                              isActive
                                ? 'bg-ink/20 text-ink hover:bg-ink/40'
                                : 'bg-amber/20 text-amber hover:bg-amber/40'
                            }`}
                            title="Remove subject"
                          >
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose Chapters for the Selected Subject(s) */}
              {selectedSubjects.size > 0 && currentSub && (
                <div className="rounded-2xl border border-white/10 bg-ink/60 p-3.5 space-y-3">
                  {/* Subject Tabs if Multiple Subjects are Selected */}
                  {selectedSubjects.size > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-white/5">
                      {Array.from(selectedSubjects).map((sub) => {
                        const isTabActive = currentSub === sub;
                        const subChaps = bySubject[sub] || [];
                        const countSelected = subChaps.filter((c) => selectedChapters.has(c.id)).length;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setActiveSubjectTab(sub)}
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1 text-xs font-semibold transition ${
                              isTabActive
                                ? 'bg-amber text-ink shadow-sm'
                                : 'bg-white/5 text-paper/60 hover:text-paper'
                            }`}
                          >
                            <span>{sub}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                                isTabActive ? 'bg-ink text-amber' : 'bg-white/10 text-paper/50'
                              }`}
                            >
                              {countSelected}/{subChaps.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Subject Chapter List */}
                  {(() => {
                    const subChapters = bySubject[currentSub] || [];
                    const countInSub = subChapters.filter((c) => selectedChapters.has(c.id)).length;

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-paper/80">
                            Chapters for <span className="text-amber font-semibold">{currentSub}</span> ({countInSub}/{subChapters.length})
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => selectAllInSubject(currentSub)}
                              className="text-[11px] text-amber hover:underline font-medium"
                            >
                              Select All
                            </button>
                            <span className="text-paper/20 text-xs">|</span>
                            <button
                              type="button"
                              onClick={() => clearAllInSubject(currentSub)}
                              className="text-[11px] text-paper/40 hover:text-paper"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {subChapters.length === 0 ? (
                          <div className="py-6 text-center text-xs text-paper/40">
                            No syllabus chapters registered for this subject.
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                            {subChapters.map((c) => {
                              const isChecked = selectedChapters.has(c.id);
                              return (
                                <label
                                  key={c.id}
                                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer transition ${
                                    isChecked
                                      ? 'bg-amber/10 border border-amber/20 text-paper'
                                      : 'border border-white/5 bg-white/[0.02] text-paper/70 hover:bg-white/5'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleChapter(c.id)}
                                    className="accent-amber rounded h-4 w-4"
                                  />
                                  <span className="truncate">{c.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Total Chapters Selected Badge */}
              {selectedChapters.size > 0 && (
                <div className="flex items-center justify-between px-1 text-xs text-paper/50">
                  <span>Linked Syllabus Total:</span>
                  <span className="font-mono text-amber font-semibold">
                    {selectedChapters.size} chapters across {selectedSubjects.size} subject(s)
                  </span>
                </div>
              )}

              {error && <p className="text-xs text-rust font-medium">{error}</p>}

              {/* Footer Buttons */}
              <div className="pt-2 flex gap-2.5 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-paper/70 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-amber py-3 text-xs font-semibold text-ink shadow-md shadow-amber/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create Test'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
