'use client';

import { motion } from 'framer-motion';
import type { LevelInfo } from '@/api/gamification';

interface Props {
  streak: number;
  level: LevelInfo;
}

export function StreakAndLevel({ streak, level }: Props) {
  const pct = level.xpForNextLevel > 0 ? level.xpIntoLevel / level.xpForNextLevel : 0;

  return (
    <div className="flex items-center gap-4 rounded-xl2 border border-white/5 bg-ink-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <motion.span
          key={streak}
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          className="font-display text-2xl font-medium text-amber"
        >
          {streak}
        </motion.span>
        <div className="text-xs leading-tight text-paper/50">
          day
          <br />
          streak
        </div>
      </div>

      <div className="h-8 w-px bg-white/10" />

      <div className="flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-paper/80">Level {level.level}</span>
          <span className="font-mono text-[10px] text-paper/40">
            {level.xpIntoLevel}/{level.xpForNextLevel} XP
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-sage"
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
