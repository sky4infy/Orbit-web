'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateTask, deleteTask, type TaskWithChapter } from '@/api/tasks';
import type { ChapterOverview } from '@/api/chapters';
import type { EffortLevel, TimeSlot } from '@/types/database.types';
import { getSubjectTheme } from '@/lib/subjectColors';
import { Check, ChevronDown } from 'lucide-react';

interface Props {
  task: TaskWithChapter | null;
  chapters: ChapterOverview[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: (taskId: string) => void;
}

const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];
const EFFORTS: EffortLevel[] = ['low', 'medium', 'high'];

export function EditTaskModal({ task, chapters, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);

  useEffect(() => {
    setConfirmingDelete(false);
    setChapterPickerOpen(false);
  }, [task]);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setChapterId(task.chapter?.id ?? '');
    setTimeSlot(task.time_slot);
    setEffortLevel(task.effort_level);
    setEstimatedMinutes(task.estimated_minutes ? String(task.estimated_minutes) : '');
  }, [task]);

  const groupedChapters = useMemo(() => {
    const map = new Map<string, ChapterOverview[]>();
    for (const c of chapters) {
      const sub = c.subjectName || 'Other';
      if (!map.has(sub)) map.set(sub, []);
      map.get(sub)!.push(c);
    }
    return map;
  }, [chapters]);

  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.id === chapterId);
  }, [chapters, chapterId]);

  async function handleDelete() {
    if (!task) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteTask(task.id);
      if (onDeleted) {
        onDeleted(task.id);
      } else {
        onSaved();
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        chapter_id: chapterId,
        time_slot: timeSlot,
        effort_level: effortLevel,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const selectedTheme = currentChapter ? getSubjectTheme(currentChapter.subjectName) : null;

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-100 p-5 max-h-[90vh] overflow-y-auto sm:rounded-2xl shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-semibold text-paper">Edit task</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Task Title
                </label>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper/30 focus:border-amber/50"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Custom Chapter Picker */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Chapter / Unit
                </label>
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

                <AnimatePresence>
                  {chapterPickerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-ink p-1.5 shadow-xl"
                    >
                      {Array.from(groupedChapters.entries()).map(([subName, chaps]) => {
                        const theme = getSubjectTheme(subName);
                        return (
                          <div key={subName} className="mb-2 last:mb-0">
                            <div
                              className={`sticky top-0 z-10 flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${theme.badge} mb-1`}
                            >
                              <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                              <span className="truncate">{subName}</span>
                              <span className="ml-auto font-mono text-[10px] opacity-80">
                                {chaps.length} units
                              </span>
                            </div>

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
                      })}
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
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                type="number"
                min={1}
                placeholder="Estimated minutes"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
              <button
                type="button"
                onClick={handleDelete}
                className={`rounded-xl2 py-2.5 text-xs font-semibold transition ${
                  confirmingDelete ? 'bg-rust text-ink' : 'bg-rust/10 text-rust'
                }`}
              >
                {confirmingDelete ? 'Tap again to confirm delete' : 'Delete task'}
              </button>

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
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
