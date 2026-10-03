'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Award, Trash2, ShieldCheck } from 'lucide-react';
import type { ChapterStatus } from '@/types/database.types';
import { computeConfidence } from '@/lib/curriculumData';

interface Props {
  chapter: {
    id: string;
    name: string;
    subjectName: string;
    status: ChapterStatus;
    confidence: number;
    unresolvedMistakes?: number;
  } | null;
  open: boolean;
  onClose: () => void;
  onSave: (chapterId: string, status: ChapterStatus, confidence: number) => void;
  onDelete?: (chapterId: string) => void;
}

const STATUS_CONFIG: { status: ChapterStatus; label: string; desc: string; color: string }[] = [
  {
    status: 'not_started',
    label: 'Not Started',
    desc: 'Yet to begin lectures or theory notes (0% confidence)',
    color: 'border-white/10 text-paper/60 hover:border-white/20',
  },
  {
    status: 'learning',
    label: 'Learning',
    desc: 'Watching lectures & reading theory notes (40% confidence)',
    color: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  },
  {
    status: 'practicing',
    label: 'Practicing',
    desc: 'Actively solving DPPs & PYQ problem sets (75% confidence)',
    color: 'border-amber/30 bg-amber/10 text-amber',
  },
  {
    status: 'revision_due',
    label: 'Revision Due',
    desc: 'Spaced review pending; retention decayed (55% confidence)',
    color: 'border-rust/30 bg-rust/10 text-rust',
  },
  {
    status: 'mastered',
    label: 'Mastered (Completed)',
    desc: 'Consistently scoring 80%+ with zero doubts (95% confidence)',
    color: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-semibold',
  },
];

export function ChapterStatusModal({ chapter, open, onClose, onSave, onDelete }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<ChapterStatus>(chapter?.status ?? 'not_started');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state when chapter changes
  if (chapter && selectedStatus !== chapter.status && !open) {
    setSelectedStatus(chapter.status);
    setIsDeleting(false);
  }

  if (!chapter) return null;

  const mistakes = chapter.unresolvedMistakes ?? 0;
  const autoConfidence = computeConfidence(selectedStatus, mistakes);

  function handleConfirm() {
    if (!chapter) return;
    onSave(chapter.id, selectedStatus, autoConfidence);
    onClose();
  }

  function handleDelete() {
    if (!chapter || !onDelete) return;
    const ok = window.confirm(`Remove "${chapter.name}" from your syllabus?\n\n(Use this if it was added twice or is not in your exam syllabus)`);
    if (ok) {
      onDelete(chapter.id);
      onClose();
    }
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
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <p className="font-mono text-[10px] uppercase text-amber tracking-wider">
                  {chapter.subjectName}
                </p>
                <h3 className="font-display text-base font-semibold text-paper line-clamp-1">
                  {chapter.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-paper/40 hover:bg-white/5 hover:text-paper"
              >
                <X size={15} />
              </button>
            </div>

            {/* Select Status */}
            <div className="mt-4">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-2 block">
                Update Syllabus Mastery Status
              </label>
              <div className="flex flex-col gap-2">
                {STATUS_CONFIG.map((cfg) => {
                  const isSelected = selectedStatus === cfg.status;
                  return (
                    <button
                      key={cfg.status}
                      type="button"
                      onClick={() => setSelectedStatus(cfg.status)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition ${
                        isSelected
                          ? `${cfg.color} ring-1 ring-amber/30 shadow-sm`
                          : 'border-white/5 bg-ink text-paper/60 hover:border-white/15'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-paper">{cfg.label}</p>
                        <p className="text-[10px] text-paper/40 mt-0.5">{cfg.desc}</p>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-amber shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Automated Confidence (Linked Directly to Status) */}
            <div className="mt-4 rounded-xl border border-white/5 bg-ink p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber" />
                  <span className="text-xs font-medium text-paper">System Confidence Score</span>
                </div>
                <span className="font-mono text-sm font-bold text-amber">{autoConfidence}%</span>
              </div>
              <p className="mt-1 text-[11px] text-paper/45 leading-relaxed">
                Calculated automatically from status ({STATUS_CONFIG.find((c) => c.status === selectedStatus)?.label}).
                {mistakes > 0 && ` Active error penalty: -${Math.min(mistakes * 5, 25)}% (${mistakes} unreviewed mistakes).`}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
              {onDelete ? (
                isDeleting ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(chapter.id);
                        onClose();
                      }}
                      className="rounded-lg bg-rust/20 px-2.5 py-1 text-[11px] font-semibold text-rust hover:bg-rust/30 transition active:scale-95"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleting(false)}
                      className="text-[11px] text-paper/40 hover:text-paper"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDeleting(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-rust/70 hover:text-rust transition py-1"
                    title="Remove if added twice or not in your syllabus"
                  >
                    <Trash2 size={13} />
                    <span>Remove Chapter</span>
                  </button>
                )
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 px-3.5 py-1.5 text-xs font-medium text-paper/60 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 rounded-xl bg-amber px-4 py-1.5 text-xs font-semibold text-ink shadow-md shadow-amber/20 hover:brightness-110 active:scale-95 transition"
                >
                  <Award size={14} />
                  <span>Save Progress</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
