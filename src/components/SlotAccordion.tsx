'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { IncompleteReason, TimeSlot } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';

interface Props {
  tasksBySlot: { slot: TimeSlot; items: TaskWithChapter[] }[];
  onDone: (taskId: string) => void;
  onSkip: (taskId: string, reason: IncompleteReason) => void;
  reasonPickerFor: string | null;
  setReasonPickerFor: (id: string | null) => void;
  defaultOpenSlot?: TimeSlot;
}

const REASON_LABELS: Record<IncompleteReason, string> = {
  too_difficult: 'Too difficult',
  distraction: 'Got distracted',
  ran_out_of_time: 'Ran out of time',
  coaching_overran: 'Coaching overran',
  illness: 'Not feeling well',
  bad_planning: 'Planned unrealistically',
};

const SLOT_LABEL: Record<TimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export function SlotAccordion({
  tasksBySlot,
  onDone,
  onSkip,
  reasonPickerFor,
  setReasonPickerFor,
  defaultOpenSlot,
}: Props) {
  const [openSlot, setOpenSlot] = useState<TimeSlot | null>(defaultOpenSlot ?? null);

  return (
    <div className="flex flex-col gap-3">
      {tasksBySlot.map(({ slot, items }) => {
        const completed = items.filter((t) => t.status === 'completed').length;
        const pct = items.length > 0 ? (completed / items.length) * 100 : 0;
        const isOpen = openSlot === slot;
        const allDone = items.length > 0 && completed === items.length;

        return (
          <div
            key={slot}
            className={`rounded-xl2 border p-4 transition-colors ${
              allDone ? 'border-sage/30 bg-sage/5' : 'border-white/5 bg-ink-50'
            }`}
          >
            <button
              onClick={() => setOpenSlot(isOpen ? null : slot)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{SLOT_LABEL[slot]}</span>
                  <span className="font-mono text-xs text-paper/40">
                    {completed}/{items.length}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className={`h-full rounded-full ${allDone ? 'bg-sage' : 'bg-amber'}`}
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`ml-3 shrink-0 text-paper/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
                    {items.map((task) => (
                      <div key={task.id} className="relative flex items-start gap-3">
                        <button
                          onClick={() => task.status === 'pending' && onDone(task.id)}
                          className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 transition ${
                            task.status === 'completed'
                              ? 'border-sage bg-sage'
                              : 'border-paper/20 hover:border-amber'
                          }`}
                          aria-label="Mark done"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${
                              task.status === 'completed' ? 'text-paper/30 line-through' : 'text-paper'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-xs text-paper/40">
                            {task.chapter?.subject?.name} · {task.chapter?.name}
                          </p>
                          {task.status === 'skipped' && task.incomplete_reason && (
                            <p className="mt-0.5 text-xs text-rust">
                              {REASON_LABELS[task.incomplete_reason]}
                            </p>
                          )}
                        </div>
                        {task.status === 'pending' && (
                          <button
                            onClick={() => setReasonPickerFor(task.id)}
                            className="shrink-0 text-xs text-paper/30 hover:text-paper/60"
                          >
                            Skip
                          </button>
                        )}

                        {reasonPickerFor === task.id && (
                          <div className="absolute right-0 top-6 z-10 w-48 rounded-xl2 border border-white/10 bg-ink-100 p-2 shadow-xl">
                            {(Object.keys(REASON_LABELS) as IncompleteReason[]).map((reason) => (
                              <button
                                key={reason}
                                onClick={() => onSkip(task.id, reason)}
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-paper/80 hover:bg-white/5"
                              >
                                {REASON_LABELS[reason]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
