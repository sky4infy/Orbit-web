'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, CheckCircle2, AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import type { TimeSlot } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';

interface Props {
  task: TaskWithChapter | null;
  activeSlot?: TimeSlot;
  isOverdue?: boolean;
  overdueTask?: TaskWithChapter | null;
  overdueCount?: number;
  isShowingPinned?: boolean;
  onStart: (taskId: string) => void;
  onDeferTask?: (task: TaskWithChapter) => void;
  onSwitchTask?: (task: TaskWithChapter) => void;
  onResetToActiveSlot?: () => void;
}

export function NextMissionCard({
  task,
  activeSlot,
  isOverdue = false,
  overdueTask,
  overdueCount = 0,
  isShowingPinned = false,
  onStart,
  onDeferTask,
  onSwitchTask,
  onResetToActiveSlot,
}: Props) {
  // Derive task type badge
  const titleLower = task?.title.toLowerCase() ?? '';
  let taskType = 'Core Mission';
  let badgeColor = 'bg-white/5 text-paper/70 border-white/10';

  if (titleLower.includes('pyq') || titleLower.includes('previous year')) {
    taskType = 'PYQ Practice';
    badgeColor = 'bg-amber/15 text-amber border-amber/30';
  } else if (titleLower.includes('theory') || titleLower.includes('lecture') || titleLower.includes('read')) {
    taskType = 'Concept Theory';
    badgeColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  } else if (titleLower.includes('dpp') || titleLower.includes('problem') || titleLower.includes('solve')) {
    taskType = 'DPP / Problem Set';
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (titleLower.includes('revision') || titleLower.includes('revise')) {
    taskType = 'Active Recall';
    badgeColor = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-ink-100 to-ink-50 p-5 shadow-lg backdrop-blur-md">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber/5 blur-3xl" />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isShowingPinned ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-indigo-400" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                Focused Catch-up Mission
              </p>
              {onResetToActiveSlot && activeSlot && (
                <button
                  onClick={onResetToActiveSlot}
                  className="font-mono text-[10px] text-amber hover:underline ml-1"
                >
                  ← Back to {activeSlot} slot
                </button>
              )}
            </>
          ) : isOverdue ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Overdue Catch-up Mission
              </p>
              {task?.time_slot && (
                <span className="font-mono text-[10px] text-paper/40">
                  · {task.time_slot.toUpperCase()} SLOT
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex h-2 w-2 rounded-full bg-amber animate-pulse" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-paper/40">
                Current Priority Mission
              </p>
              {activeSlot && task?.time_slot === activeSlot && (
                <span className="font-mono text-[10px] font-semibold text-amber">
                  · {activeSlot.toUpperCase()} SLOT
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isOverdue && (
            <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber">
              Overdue
            </span>
          )}
          {task && (
            <span className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${badgeColor}`}>
              {taskType}
            </span>
          )}
        </div>
      </div>

      {/* Missed earlier slot banner (shown when currently focusing on active block task) */}
      {!isOverdue && !isShowingPinned && overdueTask && (
        <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={14} className="shrink-0 text-amber" />
            <span className="truncate">
              {overdueCount} task{overdueCount > 1 ? 's' : ''} missed from {overdueTask.time_slot}:{' '}
              <strong className="font-medium text-paper">{overdueTask.title}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onSwitchTask && (
              <button
                onClick={() => onSwitchTask(overdueTask)}
                className="rounded-lg bg-amber/20 px-2 py-1 font-mono text-[10px] font-semibold text-amber hover:bg-amber/30 transition"
              >
                Catch Up Now
              </button>
            )}
            {onDeferTask && (
              <button
                onClick={() => onDeferTask(overdueTask)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-paper/70 hover:text-paper hover:bg-white/10 transition"
                title="Reschedule to tomorrow"
              >
                Move to Tomorrow
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {task ? (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-mono text-xs font-medium text-amber">
              {task.chapter?.subject?.name} · {task.chapter?.name}
            </p>

            <h3 className="mt-1 font-display text-lg font-medium text-paper leading-snug">
              {task.title}
            </h3>

            <div className="mt-2.5 flex items-center gap-3 text-xs text-paper/40">
              {task.estimated_minutes && (
                <div className="flex items-center gap-1 font-mono">
                  <Clock size={12} className="text-paper/40" />
                  <span>{task.estimated_minutes} min focus block</span>
                </div>
              )}
              <span>•</span>
              <div className="flex items-center gap-1">
                <span>Effort:</span>
                <span className="font-mono text-amber">
                  {task.effort_level === 'high' ? '●●●' : task.effort_level === 'medium' ? '●●○' : '●○○'}
                </span>
              </div>
            </div>

            {isOverdue ? (
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  onClick={() => onStart(task.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber py-3 text-sm font-semibold text-ink shadow-lg shadow-amber/20 transition hover:brightness-105 active:scale-[0.99]"
                >
                  <Play size={15} className="fill-current" />
                  <span>Start Catch-up Deep Work</span>
                </button>
                {onDeferTask && (
                  <button
                    onClick={() => onDeferTask(task)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-xs font-medium text-paper/70 hover:bg-white/10 hover:text-paper transition"
                    title="Reschedule to tomorrow"
                  >
                    <Calendar size={14} />
                    <span className="hidden xs:inline">Tomorrow</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onStart(task.id)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3 text-sm font-semibold text-ink shadow-lg shadow-amber/20 transition hover:brightness-105 active:scale-[0.99]"
              >
                <Play size={15} className="fill-current" />
                <span>Start Deep Work</span>
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-3 text-center"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <p className="font-display text-sm font-medium text-paper">Orbit Clear</p>
            <p className="mt-0.5 text-xs text-paper/40">
              All scheduled missions completed. Add a new task or rest — your brain needs recovery.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
