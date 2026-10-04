'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { completeRevision, type DueRevisionRow } from '@/api/revisions';
import { getMistakeCountsByChapter } from '@/api/mistakes';
import type { ReviewGrade } from '@/lib/spacedRepetition';

interface Props {
  userId: string;
  queue: DueRevisionRow[];
  onClose: () => void;
  onFinished: () => void;
}

export function RevisionSession({ userId, queue, onClose, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = queue[index];

  async function handleAssessment(grade: ReviewGrade) {
    if (!current || saving) return;
    setSaving(true);
    const wasSuccessful = grade !== 'failed';
    try {
      const counts = await getMistakeCountsByChapter(userId);
      const unresolvedForChapter = counts[current.chapter_id]?.total ?? 0;
      await completeRevision(userId, current.id, wasSuccessful, unresolvedForChapter, grade);
    } finally {
      setSaving(false);
      setRevealed(false);
      if (index + 1 < queue.length) {
        setIndex(index + 1);
      } else {
        onFinished();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="flex items-center justify-between px-5 pt-6">
        <span className="font-mono text-xs text-paper/40">
          {Math.min(index + 1, queue.length)}/{queue.length}
        </span>
        <button onClick={onClose} aria-label="Close" className="text-paper/40 hover:text-paper">
          <X size={22} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full max-w-sm text-center"
            >
              <p className="mb-3 text-xs uppercase tracking-wide text-paper/40 font-mono">{current.subject_name}</p>
              <h2 className="font-display text-2xl sm:text-3xl font-medium leading-snug">{current.chapter_name}</h2>
              <p className="mt-3 text-sm text-paper/40">Can you recall the core derivations and formulas?</p>

              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-10 rounded-2xl bg-amber/15 px-6 py-3.5 text-sm font-semibold text-amber ring-1 ring-amber/30 hover:bg-amber/25 transition shadow-lg"
                >
                  Ready to self-assess
                </button>
              ) : (
                <div className="mt-10 flex flex-col gap-2.5 sm:flex-row">
                  <button
                    onClick={() => handleAssessment('failed')}
                    disabled={saving}
                    className="flex-1 rounded-2xl bg-rust/15 py-3 px-3 text-xs font-semibold text-rust border border-rust/30 hover:bg-rust/25 transition"
                  >
                    Still shaky (1d)
                  </button>
                  <button
                    onClick={() => handleAssessment('good')}
                    disabled={saving}
                    className="flex-1 rounded-2xl bg-amber/15 py-3 px-3 text-xs font-semibold text-amber border border-amber/30 hover:bg-amber/25 transition"
                  >
                    Good recall
                  </button>
                  <button
                    onClick={() => handleAssessment('easy')}
                    disabled={saving}
                    className="flex-1 rounded-2xl bg-emerald-500/15 py-3 px-3 text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition"
                  >
                    Mastered
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <p className="font-display text-2xl font-medium text-amber">All caught up</p>
              <p className="mt-2 text-sm text-paper/40">Spaced repetition queue cleared for today.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
