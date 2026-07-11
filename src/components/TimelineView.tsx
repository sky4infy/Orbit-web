'use client';

import { useEffect, useState } from 'react';
import type { IncompleteReason, TimeSlot } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';

interface Props {
  tasksBySlot: { slot: TimeSlot; items: TaskWithChapter[] }[];
  onDone: (taskId: string) => void;
  onSkip: (taskId: string, reason: IncompleteReason) => void;
  reasonPickerFor: string | null;
  setReasonPickerFor: (id: string | null) => void;
}

const REASON_LABELS: Record<IncompleteReason, string> = {
  too_difficult: 'Too difficult',
  distraction: 'Got distracted',
  ran_out_of_time: 'Ran out of time',
  coaching_overran: 'Coaching overran',
  illness: 'Not feeling well',
  bad_planning: 'Planned unrealistically',
};

const SLOT_META: Record<TimeSlot, { label: string; hours: [number, number] }> = {
  morning: { label: 'Morning', hours: [5, 12] },
  afternoon: { label: 'Afternoon', hours: [12, 17] },
  evening: { label: 'Evening', hours: [17, 20] },
  night: { label: 'Night', hours: [20, 24] },
};

function currentSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export function TimelineView({ tasksBySlot, onDone, onSkip, reasonPickerFor, setReasonPickerFor }: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const activeSlot = currentSlot(now.getHours());

  return (
    <div className="relative pl-6">
      <div className="absolute bottom-0 left-[7px] top-2 w-px bg-white/10" />

      {tasksBySlot.map(({ slot, items }) => {
        const isNow = slot === activeSlot;
        return (
          <section key={slot} className="relative mb-7">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`absolute -left-6 h-3.5 w-3.5 rounded-full border-2 ${
                  isNow ? 'border-amber bg-amber' : 'border-paper/20 bg-ink'
                }`}
              />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-paper/40">
                {SLOT_META[slot].label}
              </h2>
              {isNow && (
                <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber">
                  now
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {items.map((task) => (
                <div key={task.id} className="relative rounded-xl2 border border-white/5 bg-ink-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-medium ${
                          task.status === 'completed' ? 'text-paper/30 line-through' : 'text-paper'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-paper/40">
                        {task.chapter?.subject?.name} · {task.chapter?.name}
                      </p>
                      {task.status === 'skipped' && task.incomplete_reason && (
                        <p className="mt-1 text-xs text-rust">{REASON_LABELS[task.incomplete_reason]}</p>
                      )}
                    </div>

                    {task.status === 'pending' && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => onDone(task.id)}
                          className="rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-ink"
                        >
                          Done
                        </button>
                        <button
                          onClick={() => setReasonPickerFor(task.id)}
                          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-paper/70"
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>

                  {reasonPickerFor === task.id && (
                    <div className="absolute right-4 top-14 z-10 w-48 rounded-xl2 border border-white/10 bg-ink-100 p-2 shadow-xl">
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
          </section>
        );
      })}
    </div>
  );
}
