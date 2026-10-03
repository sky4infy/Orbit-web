'use client';

import { motion, useAnimation, type PanInfo } from 'framer-motion';
import type { MistakeRow } from '@/api/mistakes';
import { vibrate } from '@/lib/haptics';

interface Props {
  mistake: MistakeRow;
  onResolve: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  conceptual: 'Concept Gap',
  calculation: 'Calculation Slip',
  silly: 'Silly Error',
  time_pressure: 'Time Pressure',
  misread_question: 'Misread Question',
  tle: 'TLE (Time Limit)',
  corner_case: 'Corner Case Bug',
  logic_flaw: 'Logic Invariant Flaw',
  memory_oom: 'Memory / OOM',
};

const SWIPE_THRESHOLD = 90;

export function MistakeCard({ mistake, onResolve }: Props) {
  const controls = useAnimation();

  async function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      vibrate(10);
      await controls.start({ x: 400, opacity: 0, transition: { duration: 0.2 } });
      onResolve(mistake.id);
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
    }
  }

  if (mistake.resolved) {
    return (
      <div className="rounded-xl2 border border-white/5 bg-ink-50 p-4 opacity-40">
        <p className="text-xs text-paper/40">{mistake.subject_name} · {mistake.chapter_name}</p>
        <p className="mt-1 text-sm text-paper/50 line-through">{TYPE_LABEL[mistake.mistake_type]}</p>
      </div>
    );
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      animate={controls}
      className="cursor-grab rounded-xl2 border border-white/5 bg-ink-50 p-4 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-paper/40">
            {mistake.subject_name} · {mistake.chapter_name}
          </p>
          <p className="mt-1 text-sm font-medium">{TYPE_LABEL[mistake.mistake_type]}</p>
          {mistake.description && <p className="mt-1 text-xs text-paper/50">{mistake.description}</p>}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            mistake.difficulty === 'hard'
              ? 'bg-rust/20 text-rust'
              : mistake.difficulty === 'medium'
                ? 'bg-amber/20 text-amber'
                : 'bg-sage/20 text-sage'
          }`}
        >
          {mistake.difficulty}
        </span>
      </div>
      <p className="mt-3 text-[10px] text-paper/25">Swipe right to mark reviewed</p>
    </motion.div>
  );
}
