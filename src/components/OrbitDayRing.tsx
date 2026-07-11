'use client';

import { motion } from 'framer-motion';
import type { TimeSlot } from '@/types/database.types';

interface SlotStat {
  slot: TimeSlot;
  total: number;
  completed: number;
}

interface Props {
  slots: SlotStat[];
}

const SLOT_ORDER: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];
const GAP_DEGREES = 6; // small visual gap between arcs so four segments read distinctly

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

export function OrbitDayRing({ slots }: Props) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;
  const segmentDeg = 360 / 4;

  const totalTasks = slots.reduce((s, x) => s + x.total, 0);
  const totalDone = slots.reduce((s, x) => s + x.completed, 0);
  const dayComplete = totalTasks > 0 && totalDone === totalTasks;

  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <svg width={size} height={size} className="overflow-visible">
        {SLOT_ORDER.map((slot, i) => {
          const stat = slots.find((s) => s.slot === slot) ?? { slot, total: 0, completed: 0 };
          const startDeg = i * segmentDeg + GAP_DEGREES / 2;
          const endDeg = (i + 1) * segmentDeg - GAP_DEGREES / 2;
          const pct = stat.total > 0 ? stat.completed / stat.total : 0;
          const litEndDeg = startDeg + (endDeg - startDeg) * pct;

          return (
            <g key={slot}>
              <path
                d={arcPath(cx, cy, r, startDeg, endDeg)}
                fill="none"
                stroke="currentColor"
                className="text-white/[0.06]"
                strokeWidth={10}
                strokeLinecap="round"
              />
              {pct > 0 && (
                <motion.path
                  d={arcPath(cx, cy, r, startDeg, litEndDeg)}
                  fill="none"
                  stroke={dayComplete ? '#F0A868' : '#F0A868'}
                  strokeWidth={10}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: pct === 1 ? 1 : 0.75 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {dayComplete ? (
          <>
            <span className="text-2xl">✦</span>
            <p className="mt-1 text-center font-display text-sm font-medium text-amber">
              Orbit complete
            </p>
          </>
        ) : (
          <>
            <span className="font-mono text-2xl font-medium">
              {totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0}%
            </span>
            <span className="text-xs text-paper/40">
              {totalDone}/{totalTasks} today
            </span>
          </>
        )}
      </div>
    </div>
  );
}
