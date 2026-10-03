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

// Real clock duration per slot (hours), not equal quarters — morning (05:00–12:00)
// is genuinely a bigger wedge than evening (17:00–20:00). The ring starts at
// 05:00 so night (20:00–05:00) wraps midnight and closes the circle exactly.
const SLOT_HOURS: Record<TimeSlot, number> = {
  morning: 7,
  afternoon: 5,
  evening: 3,
  night: 9,
};
const DAY_START_HOUR = 5;

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

  const totalTasks = slots.reduce((s, x) => s + x.total, 0);
  const totalDone = slots.reduce((s, x) => s + x.completed, 0);
  const dayComplete = totalTasks > 0 && totalDone === totalTasks;

  // running degree offset, built from real slot durations (sums to 360)
  let acc = 0;
  const segments = SLOT_ORDER.map((slot) => {
    const hours = SLOT_HOURS[slot];
    const segStart = acc * (360 / 24);
    acc += hours;
    const segEnd = acc * (360 / 24);
    return { slot, segStart, segEnd };
  });

  // current-time marker position, measured the same way (hours since 05:00)
  const now = new Date();
  const hoursSinceStart = ((now.getHours() - DAY_START_HOUR + 24) % 24) + now.getMinutes() / 60;
  const nowDeg = hoursSinceStart * (360 / 24);
  const nowPoint = polarToXY(cx, cy, r, nowDeg);

  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <svg width={size} height={size} className="overflow-visible">
        {segments.map(({ slot, segStart, segEnd }) => {
          const stat = slots.find((s) => s.slot === slot) ?? { slot, total: 0, completed: 0 };
          const startDeg = segStart + GAP_DEGREES / 2;
          const endDeg = segEnd - GAP_DEGREES / 2;
          const pct = stat.total > 0 ? stat.completed / stat.total : 0;
          const litEndDeg = startDeg + (endDeg - startDeg) * pct;
          const hasTasks = stat.total > 0;

          return (
            <g key={slot}>
              <path
                d={arcPath(cx, cy, r, startDeg, endDeg)}
                fill="none"
                stroke="currentColor"
                className={hasTasks ? 'text-white/[0.08]' : 'text-white/[0.03]'}
                strokeWidth={10}
                strokeLinecap="round"
              />
              {pct > 0 && (
                <motion.path
                  d={arcPath(cx, cy, r, startDeg, litEndDeg)}
                  fill="none"
                  stroke="currentColor"
                  className="text-amber"
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

        {/* current-time marker — only meaningful once there's a plan to track against */}
        {totalTasks > 0 && !dayComplete && (
          <>
            <circle cx={nowPoint.x} cy={nowPoint.y} r={7} className="fill-amber/25" />
            <circle cx={nowPoint.x} cy={nowPoint.y} r={3} className="fill-paper" />
          </>
        )}
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
            <span className="font-mono text-2xl font-medium text-paper">
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
