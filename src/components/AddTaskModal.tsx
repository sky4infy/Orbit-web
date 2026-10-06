'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTask } from '@/api/tasks';
import type { ChapterOverview } from '@/api/chapters';
import type { EffortLevel, TimeSlot } from '@/types/database.types';
import { getSubjectTheme } from '@/lib/subjectColors';
import { Check, ChevronDown, BookOpen } from 'lucide-react';

interface Props {
  userId: string;
  date: string;
  chapters: ChapterOverview[];
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];
const EFFORTS: EffortLevel[] = ['low', 'medium', 'high'];

export function AddTaskModal({ userId, date, chapters, open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [chapterId, setChapterId] = useState('');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);

  // Group chapters by subject name
  const { subjectNames, chaptersBySubject } = useMemo(() => {
    const map = new Map<string, ChapterOverview[]>();
    for (const c of chapters) {
      const sub = c.subjectName || 'Other';
      if (!map.has(sub)) map.set(sub, []);
      map.get(sub)!.push(c);
    }
    return {
      subjectNames: Array.from(map.keys()),
      chaptersBySubject: map,
    };
  }, [chapters]);

  // Selected chapter object
  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.id === chapterId);
  }, [chapters, chapterId]);

  // Filtered chapters based on selected subject
  const filteredChapters = useMemo(() => {
    if (selectedSubject === 'all') return chapters;
    return chaptersBySubject.get(selectedSubject) ?? [];
  }, [selectedSubject, chapters, chaptersBySubject]);

  // Keep chapterId valid whenever chapters or subject filter changes
  useEffect(() => {
    if (filteredChapters.length > 0) {
      const exists = filteredChapters.some((c) => c.id === chapterId);
      if (!exists) {
        setChapterId(filteredChapters[0].id);
      }
    } else {
      setChapterId('');
    }
  }, [filteredChapters, chapterId]);

  // Reset modal state when opening
  useEffect(() => {
    if (open) {
      setError(null);
      setChapterPickerOpen(false);
      if (!chapterId && chapters.length > 0) {
        setChapterId(chapters[0].id);
      }
    }
  }, [open, chapters, chapterId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !chapterId) {
      setError('Give the task a title and pick a chapter.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTask({
        user_id: userId,
        chapter_id: chapterId,
        title: title.trim(),
        scheduled_date: date,
        time_slot: timeSlot,
        effort_level: effortLevel,
        priority: 2,
        position: 0,
        status: 'pending',
        incomplete_reason: null,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        actual_minutes: null,
      });
      setTitle('');
      setEstimatedMinutes('');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Could not save the task.');
    } finally {
      setSaving(false);
    }
  }

  const selectedTheme = currentChapter ? getSubjectTheme(currentChapter.subjectName) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-100 p-5 shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-semibold text-paper">Add a task</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Task Title
                </label>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper/30 focus:border-amber/50"
                  placeholder="e.g. Read Unit 1 notes, Solve 10 problems"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Subject Filter Pills */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Subject Category
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubject('all');
                      setChapterPickerOpen(false);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                      selectedSubject === 'all'
                        ? 'bg-amber text-ink shadow-sm'
                        : 'border border-white/10 bg-white/5 text-paper/60 hover:text-paper'
                    }`}
                  >
                    All Subjects
                  </button>
                  {subjectNames.map((name) => {
                    const theme = getSubjectTheme(name);
                    const isSelected = selectedSubject === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setSelectedSubject(name);
                          setChapterPickerOpen(false);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                          isSelected
                            ? `${theme.badge} ring-1 ring-current shadow-sm`
                            : 'border-white/5 bg-ink/60 text-paper/60 hover:border-white/20 hover:text-paper'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Chapter Picker */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Chapter / Unit
                </label>
                
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setChapterPickerOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                    chapterPickerOpen
                      ? 'border-amber/50 bg-ink-50'
                      : 'border-white/10 bg-ink hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {selectedTheme && (
                      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${selectedTheme.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedTheme.dot}`} />
                        {currentChapter?.subjectName}
                      </span>
                    )}
                    <span className="text-paper truncate font-medium">
                      {currentChapter?.name || 'Select a chapter...'}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-paper/40 shrink-0 ml-2 transition-transform ${
                      chapterPickerOpen ? 'rotate-180 text-amber' : ''
                    }`}
                  />
                </button>

                {/* Custom Expandable List with Colored Subject Headers */}
                <AnimatePresence>
                  {chapterPickerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-ink p-1.5 shadow-xl"
                    >
                      {selectedSubject === 'all' ? (
                        Array.from(chaptersBySubject.entries()).map(([subName, chaps]) => {
                          const theme = getSubjectTheme(subName);
                          return (
                            <div key={subName} className="mb-2 last:mb-0">
                              {/* Colored Subject Header Banner */}
                              <div
                                className={`sticky top-0 z-10 flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${theme.badge} mb-1`}
                              >
                                <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                                <span className="truncate">{subName}</span>
                                <span className="ml-auto font-mono text-[10px] opacity-80">
                                  {chaps.length} units
                                </span>
                              </div>

                              {/* Chapter items */}
                              <div className="flex flex-col gap-0.5 pl-1">
                                {chaps.map((c) => {
                                  const isSelected = c.id === chapterId;
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setChapterId(c.id);
                                        setChapterPickerOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                        isSelected
                                          ? 'bg-amber/15 text-amber font-semibold ring-1 ring-amber/30'
                                          : 'text-paper/70 hover:bg-white/5 hover:text-paper'
                                      }`}
                                    >
                                      <span className="truncate pr-2">{c.name}</span>
                                      {isSelected && <Check size={14} className="text-amber shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {filteredChapters.map((c) => {
                            const isSelected = c.id === chapterId;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setChapterId(c.id);
                                  setChapterPickerOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                  isSelected
                                    ? 'bg-amber/15 text-amber font-semibold ring-1 ring-amber/30'
                                    : 'text-paper/70 hover:bg-white/5 hover:text-paper'
                                }`}
                              >
                                <span className="truncate pr-2">{c.name}</span>
                                {isSelected && <Check size={14} className="text-amber shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}
                >
                  {SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                  value={effortLevel}
                  onChange={(e) => setEffortLevel(e.target.value as EffortLevel)}
                >
                  {EFFORTS.map((e) => (
                    <option key={e} value={e}>
                      {e[0].toUpperCase() + e.slice(1)} effort
                    </option>
                  ))}
                </select>
              </div>

              <input
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-paper/30"
                placeholder="Estimated minutes (optional)"
                type="number"
                min={1}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />

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
                  disabled={saving || chapters.length === 0}
                  className="flex-1 rounded-xl2 bg-amber px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {saving ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
