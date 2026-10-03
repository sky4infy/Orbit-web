'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { completeRevision, type DueRevisionRow } from '@/api/revisions';
import { getMistakeCountsByChapter } from '@/api/mistakes';

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

  async function handleAssessment(wasSuccessful: boolean) {
    if (!current || saving) return;
    setSaving(true);
    try {
      const counts = await getMistakeCountsByChapter(userId);
      const unresolvedForChapter = counts[current.chapter_id]?.total ?? 0;
      await completeRevision(userId, current.id, wasSuccessful, unresolvedForChapter);
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
        <button onClick={onClose} aria-label="Close" className="text-paper/40">
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
              <p className="mb-3 text-xs uppercase tracking-wide text-paper/40">{current.subject_name}</p>
              <h2 className="font-display text-3xl font-medium leading-snug">{current.chapter_name}</h2>
              <p className="mt-3 text-sm text-paper/40">Can you recall the key ideas without looking?</p>

              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-10 rounded-xl2 bg-white/5 px-6 py-3 text-sm font-semibold text-paper/80"
                >
                  Ready to self-assess
                </button>
              ) : (
                <div className="mt-10 flex gap-3">
                  <button
                    onClick={() => handleAssessment(false)}
                    disabled={saving}
                    className="flex-1 rounded-xl2 bg-rust/15 py-3 text-sm font-semibold text-rust"
                  >
                    Still shaky
                  </button>
                  <button
                    onClick={() => handleAssessment(true)}
                    disabled={saving}
                    className="flex-1 rounded-xl2 bg-sage/15 py-3 text-sm font-semibold text-sage"
                  >
                    Got it
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <p className="font-display text-2xl font-medium text-amber">All caught up</p>
              <p className="mt-2 text-sm text-paper/40">No more revisions due right now.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
