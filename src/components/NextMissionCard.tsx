'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { TaskWithChapter } from '@/api/tasks';

interface Props {
  task: TaskWithChapter | null;
  onStart: (taskId: string) => void;
}

const SUBJECT_ACCENT: Record<string, string> = {
  Physics: 'text-subject-physics',
  Chemistry: 'text-subject-chemistry',
  Maths: 'text-subject-maths',
  Mathematics: 'text-subject-maths',
  Biology: 'text-subject-biology',
};

export function NextMissionCard({ task, onStart }: Props) {
  return (
    <div className="rounded-xl2 border border-white/5 bg-ink-50 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-paper/40">Next mission</p>

      <AnimatePresence mode="wait">
        {task ? (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <p className={`text-xs font-semibold ${SUBJECT_ACCENT[task.chapter?.subject?.name ?? ''] ?? 'text-paper/60'}`}>
              {task.chapter?.subject?.name} · {task.chapter?.name}
            </p>
            <h3 className="mt-1 font-display text-xl font-medium">{task.title}</h3>
            {task.estimated_minutes && (
              <p className="mt-1 text-sm text-paper/40">Estimated {task.estimated_minutes} min</p>
            )}
            <button
              onClick={() => onStart(task.id)}
              className="mt-4 w-full rounded-xl2 bg-amber py-3 text-sm font-semibold text-ink transition hover:brightness-95"
            >
              Start
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-2 text-sm text-paper/40"
          >
            Nothing left in today's orbit. Add a task to keep going, or rest — you've earned it.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
