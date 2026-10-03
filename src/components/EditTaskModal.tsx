'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateTask, deleteTask, type TaskWithChapter } from '@/api/tasks';
import type { ChapterOverview } from '@/api/chapters';
import type { EffortLevel, TimeSlot } from '@/types/database.types';

interface Props {
  task: TaskWithChapter | null;
  chapters: ChapterOverview[];
  onClose: () => void;
  onSaved: () => void;
}

const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];
const EFFORTS: EffortLevel[] = ['low', 'medium', 'high'];

export function EditTaskModal({ task, chapters, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setConfirmingDelete(false);
  }, [task]);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setChapterId(task.chapter?.id ?? '');
    setTimeSlot(task.time_slot);
    setEffortLevel(task.effort_level);
    setEstimatedMinutes(task.estimated_minutes ? String(task.estimated_minutes) : '');
  }, [task]);

  async function handleDelete() {
    if (!task) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteTask(task.id);
      onSaved();
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

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-xl2 border border-white/10 bg-ink-100 p-5 sm:rounded-xl2"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-medium">Edit task</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subjectName} · {c.name}
                  </option>
                ))}
              </select>
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
