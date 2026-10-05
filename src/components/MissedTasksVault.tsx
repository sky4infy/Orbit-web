'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderArchive,
  ChevronDown,
  Calendar,
  Clock,
  ArrowRight,
  FastForward,
  CheckCircle2,
  CalendarCheck2,
  Layers,
} from 'lucide-react';
import { format, isYesterday, parseISO } from 'date-fns';
import type { TaskWithChapter } from '@/api/tasks';
import type { TimeSlot } from '@/types/database.types';

interface Props {
  missedTasks: TaskWithChapter[];
  todayDate: string;
  onRescheduleToToday: (task: TaskWithChapter) => void;
  onRescheduleCustom: (task: TaskWithChapter, newDate: string, newSlot?: TimeSlot) => void;
  onRescheduleAllToToday: () => void;
  onRequestSkip: (task: TaskWithChapter) => void;
}

const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export function MissedTasksVault({
  missedTasks,
  todayDate,
  onRescheduleToToday,
  onRescheduleCustom,
  onRescheduleAllToToday,
  onRequestSkip,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithChapter | null>(null);
  const [customDate, setCustomDate] = useState(todayDate);
  const [customSlot, setCustomSlot] = useState<TimeSlot>('morning');

  if (missedTasks.length === 0) {
    return null;
  }

  function handleOpenCustom(task: TaskWithChapter) {
    setEditingTask(task);
    setCustomDate(todayDate);
    setCustomSlot(task.time_slot);
  }

  function handleSaveCustom() {
    if (editingTask) {
      onRescheduleCustom(editingTask, customDate, customSlot);
      setEditingTask(null);
    }
  }

  function formatMissedDate(dateStr: string) {
    try {
      const d = parseISO(dateStr);
      if (isYesterday(d)) {
        return 'Yesterday';
      }
      return format(d, 'MMM d');
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="rounded-2xl border border-amber/20 bg-gradient-to-b from-ink-100 to-ink-50 shadow-lg backdrop-blur-md overflow-hidden">
      {/* Folder Header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber/15 text-amber ring-1 ring-amber/30">
            <FolderArchive size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-paper">
                Missed Missions Vault
              </h3>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber">
                {missedTasks.length} left behind
              </span>
            </div>
            <p className="text-[11px] text-paper/40 mt-0.5">
              Unfinished missions from previous days · Zero academic debt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline font-mono text-xs text-amber hover:underline">
            {isOpen ? 'Collapse' : 'Review & Reschedule'}
          </span>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-paper/40 transition-transform ${
              isOpen ? 'rotate-180 text-paper/80' : ''
            }`}
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </button>

      {/* Expanded Vault Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5 px-4 pb-4 pt-3"
          >
            {/* Batch Action Bar */}
            <div className="mb-3.5 flex items-center justify-between rounded-xl border border-white/5 bg-ink/60 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs text-paper/60">
                <Layers size={14} className="text-amber" />
                <span>
                  Reschedule all {missedTasks.length} missions into today's plan
                </span>
              </div>
              <button
                onClick={onRescheduleAllToToday}
                className="flex items-center gap-1.5 rounded-lg bg-amber px-2.5 py-1 text-xs font-semibold text-ink shadow-sm transition hover:brightness-105 active:scale-95"
              >
                <CalendarCheck2 size={13} />
                <span>Move All to Today</span>
              </button>
            </div>

            {/* List of Missed Tasks */}
            <div className="flex flex-col gap-2.5">
              {missedTasks.map((t) => {
                const missedLabel = formatMissedDate(t.scheduled_date);
                return (
                  <div
                    key={t.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink/40 p-3 transition hover:border-white/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                        <span className="rounded-md border border-amber/30 bg-amber/10 px-1.5 py-0.5 text-amber">
                          Missed {missedLabel} · {SLOT_LABELS[t.time_slot]}
                        </span>
                        <span className="text-paper/40 truncate max-w-[200px]">
                          {t.chapter?.subject?.name} · {t.chapter?.name}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-paper leading-snug break-words line-clamp-2">
                        {t.title}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => onRescheduleToToday(t)}
                        className="flex items-center gap-1 rounded-lg bg-amber/15 px-2.5 py-1.5 text-xs font-semibold text-amber ring-1 ring-amber/30 transition hover:bg-amber/25"
                        title="Reschedule to Today"
                      >
                        <Calendar size={13} />
                        <span>Today</span>
                      </button>

                      <button
                        onClick={() => handleOpenCustom(t)}
                        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-paper/70 hover:bg-white/10 hover:text-paper transition"
                        title="Pick custom date and slot"
                      >
                        <span>Reschedule...</span>
                      </button>

                      <button
                        onClick={() => onRequestSkip(t)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-paper/40 transition hover:border-rust/30 hover:bg-rust/10 hover:text-rust"
                        title="Archive / Log as Skipped (Zero debt)"
                      >
                        <FastForward size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date & Slot Picker Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-100 p-5 shadow-2xl"
            >
              <h4 className="font-display text-base font-semibold text-paper">
                Reschedule Mission
              </h4>
              <p className="mt-1 text-xs text-paper/50 line-clamp-1">
                "{editingTask.title}"
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-paper/50 mb-1">
                    TARGET DATE
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-paper focus:border-amber focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-paper/50 mb-1">
                    TIME SLOT
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['morning', 'afternoon', 'evening', 'night'] as TimeSlot[]).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setCustomSlot(slot)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition ${
                          customSlot === slot
                            ? 'border-amber bg-amber/20 text-amber'
                            : 'border-white/10 bg-white/5 text-paper/60 hover:border-white/20'
                        }`}
                      >
                        {SLOT_LABELS[slot]} Slot
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-xl px-3 py-2 text-xs text-paper/50 hover:text-paper"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="flex items-center gap-1.5 rounded-xl bg-amber px-4 py-2 text-xs font-semibold text-ink shadow-md hover:brightness-105 active:scale-95"
                >
                  <CalendarCheck2 size={13} />
                  <span>Confirm Reschedule</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
