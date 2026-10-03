'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Plus } from 'lucide-react';
import type { ChapterStatus, TrackType, SubjectProgressRow } from '@/types/database.types';
import { addCustomChapter, computeConfidence } from '@/lib/curriculumData';

interface Props {
  subjects: { subject_id: string; subject_name: string }[];
  defaultSubjectId?: string | null;
  track: TrackType;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STATUS_OPTIONS: { value: ChapterStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'learning', label: 'Learning (Lectures / Theory)' },
  { value: 'practicing', label: 'Practicing (Problem Solving)' },
  { value: 'revision_due', label: 'Revision due' },
  { value: 'mastered', label: 'Mastered (Completed)' },
];

export function AddChapterModal({
  subjects,
  defaultSubjectId,
  track,
  open,
  onClose,
  onCreated,
}: Props) {
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? subjects[0]?.subject_id ?? '');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ChapterStatus>('not_started');
  const [error, setError] = useState<string | null>(null);

  // Sync defaultSubjectId if provided
  if (defaultSubjectId && subjectId !== defaultSubjectId && subjects.some((s) => s.subject_id === defaultSubjectId)) {
    setSubjectId(defaultSubjectId);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a chapter name');
      return;
    }
    const currentSub = subjects.find((s) => s.subject_id === subjectId) ?? subjects[0];
    if (!currentSub) {
      setError('Please pick a subject');
      return;
    }

    addCustomChapter({
      name: name.trim(),
      subjectId: currentSub.subject_id,
      subjectName: currentSub.subject_name,
      track,
      status,
      confidence: computeConfidence(status, 0),
    });

    setName('');
    setError(null);
    onCreated();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-100 p-5 shadow-2xl sm:rounded-3xl"
            initial={{ y: 25, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 15, opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber/20 text-amber">
                  <Layers size={16} />
                </div>
                <h3 className="font-display text-base font-semibold text-paper">Add Chapter to Syllabus</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-paper/40 hover:bg-white/5 hover:text-paper"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              {/* Subject Selector */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-xs text-paper outline-none focus:border-amber/50"
                >
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter Name */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Chapter / Topic Name
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Rotational Dynamics, DP On Trees"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-xs text-paper placeholder:text-paper/30 outline-none focus:border-amber/50"
                />
                {error && <p className="mt-1 text-[11px] text-rust">{error}</p>}
              </div>

              {/* Initial Status */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Current Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ChapterStatus)}
                  className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-xs text-paper outline-none focus:border-amber/50"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Automated Confidence linked to status */}
              <div className="rounded-xl border border-white/5 bg-ink p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-paper/60">Initial System Confidence</span>
                  <span className="font-mono text-amber font-semibold">{computeConfidence(status, 0)}%</span>
                </div>
                <p className="text-[10px] text-paper/40 mt-0.5">
                  Calculated automatically based on chapter status.
                </p>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-paper/60 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-amber px-4 py-2 text-xs font-semibold text-ink shadow-md shadow-amber/20 hover:brightness-110 active:scale-95 transition"
                >
                  <Plus size={14} />
                  <span>Add Chapter</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
