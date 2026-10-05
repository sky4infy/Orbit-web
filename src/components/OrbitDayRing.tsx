'use client';

import { motion } from 'framer-motion';
import type { TimeSlot } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';

interface SlotStat {
  slot: TimeSlot;
  total: number;
  completed: number;
}

interface Props {
  slots?: SlotStat[];
  tasks?: TaskWithChapter[];
}

const GAP_DEGREES = 6; // visual gap between segments

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToXY(cx, cy, r, endDeg);
  const end = polarToXY(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function OrbitDayRing({ slots = [], tasks }: Props) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;

  // Derive task list or count from props
  const allTasks = tasks ?? [];
  const totalTasks =
    allTasks.length > 0 ? allTasks.length : slots.reduce((s, x) => s + x.total, 0);

  const totalDone =
    allTasks.length > 0
      ? allTasks.filter((t) => t.status === 'completed').length
      : slots.reduce((s, x) => s + x.completed, 0);

  const dayComplete = totalTasks > 0 && totalDone === totalTasks;

  // Segment generation based on actual tasks of the day
  // If user has 4 tasks today, ring has exactly 4 equal segments (one per task).
  const segmentCount = Math.max(1, totalTasks);
  const segAngle = 360 / segmentCount;

  const segments = Array.from({ length: segmentCount }).map((_, i) => {
    const isCompleted = i < totalDone;
    const startDeg = i * segAngle + (segmentCount > 1 ? GAP_DEGREES / 2 : 0);
    const endDeg = (i + 1) * segAngle - (segmentCount > 1 ? GAP_DEGREES / 2 : 0);
    return {
      index: i,
      startDeg,
      endDeg,
      isCompleted,
    };
  });

  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <svg width={size} height={size} className="overflow-visible">
        {totalTasks === 0 ? (
          // Empty State Track (Single continuous dashed circle)
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-white/[0.05]"
            strokeWidth={10}
            strokeDasharray="4 4"
          />
        ) : (
          segments.map(({ index, startDeg, endDeg, isCompleted }) => (
            <g key={index}>
              {/* Background slot track */}
              <path
                d={arcPath(cx, cy, r, startDeg, endDeg)}
                fill="none"
                stroke="currentColor"
                className="text-white/[0.08]"
                strokeWidth={10}
                strokeLinecap="round"
              />

              {/* Lit completion arc */}
              {isCompleted && (
                <motion.path
                  d={arcPath(cx, cy, r, startDeg, endDeg)}
                  fill="none"
                  stroke="currentColor"
                  className="text-amber"
                  strokeWidth={10}
                  strokeLinecap="round"
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 1, pathLength: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                />
              )}
            </g>
          ))
        )}
      </svg>

      {/* Center Metrics (Percentage + Completion Count) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {dayComplete ? (
          <>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-2xl text-amber"
            >
              ✦
            </motion.span>
            <p className="mt-1 text-center font-display text-sm font-semibold text-amber">
              Orbit Complete
            </p>
            <span className="font-mono text-[11px] text-paper/50">
              {totalDone}/{totalTasks} today
            </span>
          </>
        ) : (
          <>
            <span className="font-mono text-3xl font-semibold text-paper tracking-tight">
              {totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0}%
            </span>
            <span className="mt-0.5 font-mono text-xs text-paper/40">
              {totalDone}/{totalTasks} today
            </span>
          </>
        )}
      </div>
    </div>
  );
}
