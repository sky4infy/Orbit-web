'use client';

import { useRef, useState } from 'react';
import { motion, useAnimation, type PanInfo } from 'framer-motion';
import { Play, MoreVertical, Check, ArrowRight, SkipForward, Clock, Pencil, Trash2 } from 'lucide-react';
import type { TaskWithChapter } from '@/api/tasks';
import { CompletionBurst } from '@/components/CompletionBurst';
import { vibrate } from '@/lib/haptics';

interface Props {
  task: TaskWithChapter;
  onDone: () => void;
  onUndoDone?: () => void;
  onMove: () => void;
  onRequestSkip: () => void;
  onEdit: () => void;
  onStartFocus?: () => void;
}

const SWIPE_THRESHOLD = 70;
const MOVE_CANCEL_PX = 8;

export function SwipeableTaskRow({
  task,
  onDone,
  onUndoDone,
  onMove,
  onRequestSkip,
  onEdit,
  onStartFocus,
}: Props) {
  const controls = useAnimation();
  const [burstAt, setBurstAt] = useState(0);

  function fireBurst() {
    setBurstAt((n) => n + 1);
  }

  async function handleDragEnd(_: unknown, info: PanInfo) {
    if (task.status !== 'pending') {
      controls.start({ x: 0 });
      return;
    }
    if (info.offset.x > SWIPE_THRESHOLD) {
      vibrate(10);
      fireBurst();
      await controls.start({ x: 400, opacity: 0, transition: { duration: 0.2 } });
      onDone();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onRequestSkip();
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
    }
  }

  // Derive task type badge from title or tag
  const titleLower = task.title.toLowerCase();
  let taskType = 'Practice';
  let badgeColor = 'bg-white/5 text-paper/70 border-white/10';

  if (titleLower.includes('pyq') || titleLower.includes('previous year')) {
    taskType = 'PYQ';
    badgeColor = 'bg-amber/15 text-amber border-amber/30';
  } else if (titleLower.includes('theory') || titleLower.includes('read') || titleLower.includes('lecture')) {
    taskType = 'Theory';
    badgeColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  } else if (titleLower.includes('dpp') || titleLower.includes('problem') || titleLower.includes('solve')) {
    taskType = 'DPP';
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (titleLower.includes('revision') || titleLower.includes('revise')) {
    taskType = 'Revision';
    badgeColor = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  } else if (titleLower.includes('mock') || titleLower.includes('test') || titleLower.includes('analysis')) {
    taskType = 'Analysis';
    badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  } else if (titleLower.includes('homework') || titleLower.includes('coaching') || titleLower.includes('sheet')) {
    taskType = 'Coaching HW';
    badgeColor = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  }

  return (
    <div className="relative group overflow-hidden rounded-2xl">
      <motion.div
        drag={task.status === 'pending' ? 'x' : false}
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
          task.status === 'completed'
            ? 'border-emerald-500/20 bg-emerald-500/5 opacity-75'
            : task.status === 'skipped'
            ? 'border-white/5 bg-ink/40 opacity-50'
            : 'border-white/5 bg-ink-100 hover:border-white/10 hover:bg-ink-50 shadow-sm'
        }`}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Left: Checkbox & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Checkbox with micro-interaction */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                if (task.status === 'completed') {
                  onUndoDone?.();
                  return;
                }
                if (task.status !== 'pending') return;
                vibrate(10);
                fireBurst();
                onDone();
              }}
              className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${
                task.status === 'completed'
                  ? 'border-emerald-400 bg-emerald-400 text-ink shadow-sm shadow-emerald-400/20 hover:bg-emerald-500 hover:border-emerald-500'
                  : 'border-white/20 bg-white/5 hover:border-amber hover:bg-amber/10'
              }`}
              aria-label={task.status === 'completed' ? 'Uncheck task' : 'Mark done'}
              title={task.status === 'completed' ? 'Click to uncheck' : 'Mark done'}
            >
              {task.status === 'completed' && <Check size={14} className="stroke-[3]" />}
            </button>
            {burstAt > 0 && <CompletionBurst key={burstAt} />}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${badgeColor}`}>
                {taskType}
              </span>
              <span className="text-[11px] font-medium text-amber/90 truncate max-w-[180px]">
                {task.chapter?.subject?.name} · {task.chapter?.name}
              </span>
            </div>

            <p
              className={`mt-1 text-sm font-medium leading-snug truncate ${
                task.status === 'completed'
                  ? 'text-paper/40 line-through'
                  : 'text-paper group-hover:text-white transition-colors'
              }`}
            >
              {task.title}
            </p>
          </div>
        </div>

        {/* Right: Duration & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.estimated_minutes && (
            <div className="hidden sm:flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-paper/50">
              <Clock size={11} />
              <span>{task.estimated_minutes}m</span>
            </div>
          )}

          {task.status === 'pending' && (
            <>
              {/* Focus Timer Launch Button */}
              {onStartFocus && (
                <button
                  onClick={onStartFocus}
                  title="Start Deep Work timer on this task"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-paper/60 transition hover:border-amber/30 hover:bg-amber/10 hover:text-amber"
                >
                  <Play size={13} className="fill-current ml-0.5" />
                </button>
              )}

              {/* Edit Button */}
              <button
                onClick={onEdit}
                title="Edit task details"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-paper/60 transition hover:border-white/20 hover:text-paper"
              >
                <Pencil size={13} />
              </button>

              {/* Skip Button (Triggers Mandatory Skip Reason Modal) */}
              <button
                onClick={onRequestSkip}
                title="Skip with reason"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-paper/40 transition hover:border-rust/30 hover:bg-rust/10 hover:text-rust"
              >
                <SkipForward size={13} />
              </button>
            </>
          )}

          {task.status === 'skipped' && (
            <span className="rounded-md bg-rust/15 px-2 py-0.5 text-[10px] font-mono text-rust">
              Skipped
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
