'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { Plus } from 'lucide-react';
import type { DayOverview, TaskWithChapter } from '@/api/tasks';

interface Props {
  day: DayOverview;
  isOpen: boolean;
  onToggle: () => void;
  tasks: TaskWithChapter[] | undefined;
  loadingTasks: boolean;
  onPlanDay?: (date: string) => void;
}

export function WeekDayCard({
  day,
  isOpen,
  onToggle,
  tasks,
  loadingTasks,
  onPlanDay,
}: Props) {
  const pct = day.total > 0 ? (day.completed / day.total) * 100 : 0;
  const date = new Date(day.date + 'T00:00:00');
  const today = isToday(date);
  const isPast = !today && isBefore(date, startOfDay(new Date()));

  return (
    <div
      className={`rounded-xl2 border p-4 transition-colors ${
        today ? 'border-amber/30 bg-amber/5' : 'border-white/5 bg-ink-50'
      }`}
    >
      <button onClick={onToggle} className="flex w-full items-center justify-between">
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{format(date, 'EEE, d MMM')}</span>
            {today && (
              <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber">
                today
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs text-paper/40">
              {day.completed}/{day.total}
            </span>
          </div>
        </div>
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
              {loadingTasks ? (
                <p className="text-xs text-paper/30">Loading…</p>
              ) : tasks && tasks.length > 0 ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    {tasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span className={t.status === 'completed' ? 'text-paper/30 line-through' : 'text-paper/80'}>
                          {t.title}
                        </span>
                        <span className="text-[10px] text-paper/30">{t.time_slot}</span>
                      </div>
                    ))}
                  </div>
                  {onPlanDay && (
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanDay(day.date);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber/80 hover:text-amber transition active:scale-95"
                      >
                        <Plus className="h-3 w-3" />
                        Add mission
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-2 text-center flex flex-col items-center gap-2.5">
                  <p className="text-xs text-paper/40">
                    {isPast ? 'No missions were planned for this day.' : 'Nothing planned for this day yet.'}
                  </p>
                  {onPlanDay && (
                    <div className="pt-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanDay(day.date);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber/15 border border-amber/30 px-3.5 py-1.5 text-xs font-semibold text-amber hover:bg-amber/25 active:scale-95 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Plan Day
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
