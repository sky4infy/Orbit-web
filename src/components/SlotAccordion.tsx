'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sun, Sunset, Sunrise, Moon } from 'lucide-react';
import type { TimeSlot } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';
import { SwipeableTaskRow } from '@/components/SwipeableTaskRow';

interface Props {
  tasksBySlot: { slot: TimeSlot; items: TaskWithChapter[] }[];
  onDone: (task: TaskWithChapter) => void;
  onMove: (task: TaskWithChapter) => void;
  onRequestSkip: (task: TaskWithChapter) => void;
  onEdit: (task: TaskWithChapter) => void;
  onStartFocus?: (task: TaskWithChapter) => void;
  defaultOpenSlot?: TimeSlot;
}

const SLOT_META: Record<TimeSlot, { label: string; time: string; icon: React.ReactNode }> = {
  morning: { label: 'Morning Slot', time: '05:00 – 12:00', icon: <Sunrise size={15} className="text-amber" /> },
  afternoon: { label: 'Afternoon Slot', time: '12:00 – 17:00', icon: <Sun size={15} className="text-amber-400" /> },
  evening: { label: 'Evening Slot', time: '17:00 – 20:00', icon: <Sunset size={15} className="text-orange-400" /> },
  night: { label: 'Night Slot', time: '20:00 – 05:00', icon: <Moon size={15} className="text-indigo-400" /> },
};

export function SlotAccordion({
  tasksBySlot,
  onDone,
  onMove,
  onRequestSkip,
  onEdit,
  onStartFocus,
  defaultOpenSlot,
}: Props) {
  // Keep the current/active slot or slots with pending tasks open by default
  const [openSlots, setOpenSlots] = useState<Record<TimeSlot, boolean>>(() => {
    const initial: Record<TimeSlot, boolean> = {
      morning: false,
      afternoon: false,
      evening: false,
      night: false,
    };
    if (defaultOpenSlot) {
      initial[defaultOpenSlot] = true;
    } else {
      initial.morning = true;
    }
    // Also open any slot that has tasks if default slot has no tasks
    const activeGroup = tasksBySlot.find((g) => g.slot === defaultOpenSlot);
    if (!activeGroup || activeGroup.items.length === 0) {
      const firstWithTasks = tasksBySlot.find((g) => g.items.length > 0);
      if (firstWithTasks) initial[firstWithTasks.slot] = true;
    }
    return initial;
  });

  function toggleSlot(slot: TimeSlot) {
    setOpenSlots((prev) => ({ ...prev, [slot]: !prev[slot] }));
  }

  return (
    <div className="flex flex-col gap-3">
      {tasksBySlot.map(({ slot, items }) => {
        const completed = items.filter((t) => t.status === 'completed').length;
        const pct = items.length > 0 ? (completed / items.length) * 100 : 0;
        const isOpen = openSlots[slot] ?? false;
        const allDone = items.length > 0 && completed === items.length;
        const meta = SLOT_META[slot];

        return (
          <div
            key={slot}
            className={`rounded-2xl border transition-all ${
              allDone
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-white/5 bg-ink-100 hover:border-white/10'
            }`}
          >
            {/* Slot Header Button */}
            <button
              onClick={() => toggleSlot(slot)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                  {meta.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-paper">
                      {meta.label}
                    </span>
                    <span className="font-mono text-[10px] text-paper/30">
                      {meta.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-paper/50">
                      {completed}/{items.length} completed
                    </span>
                    {allDone && (
                      <span className="text-[10px] font-semibold text-emerald-400">
                        • Complete
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Micro Progress Bar */}
                <div className="w-16 h-1.5 overflow-hidden rounded-full bg-white/5 hidden sm:block">
                  <motion.div
                    className={`h-full rounded-full ${allDone ? 'bg-emerald-400' : 'bg-amber'}`}
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-paper/30 transition-transform ${
                    isOpen ? 'rotate-180 text-paper/70' : ''
                  }`}
                >
                  <ChevronDown size={16} />
                </div>
              </div>
            </button>

            {/* Expanded Slot Tasks */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2.5 px-4 pb-4 pt-1 border-t border-white/5">
                    {items.length === 0 ? (
                      <p className="py-3 text-center text-xs text-paper/30">
                        No missions scheduled in this block.
                      </p>
                    ) : (
                      items.map((task) => (
                        <SwipeableTaskRow
                          key={task.id}
                          task={task}
                          onDone={() => onDone(task)}
                          onMove={() => onMove(task)}
                          onRequestSkip={() => onRequestSkip(task)}
                          onEdit={() => onEdit(task)}
                          onStartFocus={onStartFocus ? () => onStartFocus(task) : undefined}
                        />
                      ))
                    )}
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
