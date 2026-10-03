'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logMistake } from '@/api/mistakes';
import type { ChapterOverview } from '@/api/chapters';
import type { Difficulty, MistakeType } from '@/types/database.types';

interface Props {
  userId: string;
  chapters: ChapterOverview[];
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TYPES: { value: MistakeType; label: string }[] = [
  { value: 'conceptual', label: 'Conceptual / Theory Gap' },
  { value: 'calculation', label: 'Calculation / Algebra Slip' },
  { value: 'silly', label: 'Silly Blunder' },
  { value: 'time_pressure', label: 'Time Pressure Rush' },
  { value: 'misread_question', label: 'Misread Question / Trap' },
  { value: 'tle', label: 'TLE (Time Limit Exceeded)' },
  { value: 'corner_case', label: 'Corner / Edge Case Missed' },
  { value: 'logic_flaw', label: 'Logic / Invariant Flaw' },
  { value: 'memory_oom', label: 'Memory Limit / OOM' },
];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export function LogMistakeModal({ userId, chapters, open, onClose, onCreated }: Props) {
  const [chapterId, setChapterId] = useState('');
  const [mistakeType, setMistakeType] = useState<MistakeType>('conceptual');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId && chapters.length > 0) setChapterId(chapters[0].id);
  }, [chapters, chapterId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chapterId) {
      setError('Pick a chapter first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await logMistake({
        user_id: userId,
        chapter_id: chapterId,
        mistake_type: mistakeType,
        difficulty,
        description: description.trim() || undefined,
      });
      setDescription('');
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
            className="w-full max-w-md rounded-t-xl2 border border-white/10 bg-ink-100 p-5 sm:rounded-xl2"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-lg font-medium">Log a mistake</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <select
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
              >
                {chapters.length === 0 && <option value="">No chapters yet</option>}
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subjectName} · {c.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                  value={mistakeType}
                  onChange={(e) => setMistakeType(e.target.value as MistakeType)}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d[0].toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="rounded-xl2 border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-paper/30"
                placeholder="What happened? (optional)"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  {saving ? 'Saving…' : 'Log it'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
