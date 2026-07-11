'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTask } from '@/api/tasks';
import type { ChapterOverview } from '@/api/chapters';
import type { EffortLevel, TimeSlot } from '@/types/database.types';

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
  const [chapterId, setChapterId] = useState('');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // default to the first chapter once chapters load, so the select isn't empty
  useEffect(() => {
    if (!chapterId && chapters.length > 0) setChapterId(chapters[0].id);
  }, [chapters, chapterId]);

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
            className="w-full max-w-md rounded-t-xl2 border border-white/10 bg-ink-100 p-5 sm:rounded-xl2"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-medium">Add a task</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-paper/30"
                placeholder="e.g. Solve 20 rotation problems"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <select
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
              >
                {chapters.length === 0 && <option value="">No chapters yet — seed some first</option>}
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
