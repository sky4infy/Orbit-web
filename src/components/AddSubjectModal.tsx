'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Plus } from 'lucide-react';
import type { TrackType } from '@/types/database.types';
import { addCustomSubject } from '@/lib/curriculumData';

interface Props {
  track: TrackType;
  open: boolean;
  onClose: () => void;
  onCreated: (newSubject: { id: string; name: string; track: TrackType }) => void;
}

export function AddSubjectModal({ track, open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a subject name');
      return;
    }
    const created = addCustomSubject(name.trim(), track);
    setName('');
    setError(null);
    onCreated(created);
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
                  <BookOpen size={16} />
                </div>
                <h3 className="font-display text-base font-semibold text-paper">Add Custom Subject</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-paper/40 hover:bg-white/5 hover:text-paper"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1.5 block">
                  Subject Name
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Organic Chemistry, Biology, Operating Systems"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-ink px-3.5 py-2.5 text-xs text-paper placeholder:text-paper/30 outline-none focus:border-amber/50"
                />
                {error && <p className="mt-1 text-[11px] text-rust">{error}</p>}
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
                  <span>Add Subject</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
