'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import type { IncompleteReason } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';

interface Props {
  task: TaskWithChapter | null;
  open: boolean;
  onClose: () => void;
  onConfirmSkip: (task: TaskWithChapter, reason: IncompleteReason, note?: string) => void;
}

export const SKIP_REASONS: { key: IncompleteReason; label: string; icon: string }[] = [
  { key: 'ran_out_of_time', label: 'Took longer than expected', icon: '⏱️' },
  { key: 'coaching_overran', label: 'Coaching homework increased', icon: '📚' },
  { key: 'bad_planning', label: 'School work conflict', icon: '🏫' },
  { key: 'too_difficult', label: "Didn't understand the concept", icon: '🧩' },
  { key: 'distraction', label: 'Planned too much / overbooked', icon: '⚖️' },
  { key: 'illness', label: 'Felt tired / low energy', icon: '🔋' },
];

export function SkipTaskModal({ task, open, onClose, onConfirmSkip }: Props) {
  const [selectedReason, setSelectedReason] = useState<IncompleteReason>('ran_out_of_time');
  const [note, setNote] = useState('');

  if (!task) return null;

  function handleConfirm() {
    if (!task) return;
    onConfirmSkip(task, selectedReason, note.trim() || undefined);
    setNote('');
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-100 p-6 shadow-2xl sm:rounded-3xl"
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rust/20 text-rust">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-paper">Skip Task</h3>
                  <p className="text-[11px] text-paper/40">Helps Orbit calibrate realistic daily capacity</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-paper/40 hover:bg-white/5 hover:text-paper"
              >
                <X size={16} />
              </button>
            </div>

            {/* Task Info */}
            <div className="my-4 rounded-xl border border-white/5 bg-ink p-3">
              <p className="text-xs text-amber font-mono">
                {task.chapter?.subject?.name} · {task.chapter?.name}
              </p>
              <p className="mt-0.5 text-sm font-medium text-paper line-clamp-1">{task.title}</p>
            </div>

            {/* Quick Reason Chips */}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-2">
              Select Quick Reason (~5 seconds)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {SKIP_REASONS.map((r) => {
                const isSelected = selectedReason === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedReason(r.key)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                      isSelected
                        ? 'border-amber/60 bg-amber/15 font-medium text-amber shadow-sm'
                        : 'border-white/5 bg-ink hover:border-white/15 text-paper/70'
                    }`}
                  >
                    <span className="text-sm">{r.icon}</span>
                    <span className="line-clamp-1">{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Short Note */}
            <div className="mb-5">
              <input
                type="text"
                placeholder="Optional 1-line note (e.g. Spent extra time on Irodov #1.14)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-xs text-paper placeholder:text-paper/30 outline-none focus:border-amber/40"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-paper/60 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-xl bg-amber px-5 py-2 text-xs font-semibold text-ink shadow-lg shadow-amber/20 hover:brightness-110 active:scale-95 transition"
              >
                Confirm & Rebalance
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
