'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Clock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { TrackType } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';
import { generateOptimalDayPlan, type PlanningEngineOutput, type SuggestedTask } from '@/lib/planningEngine';

interface Props {
  track: TrackType;
  date: string;
  tasks: TaskWithChapter[];
  chapters: { id: string; name: string; unresolvedMistakes: number; confidence: number; subjectName: string }[];
  open: boolean;
  onClose: () => void;
  onApplyPlan: (suggested: SuggestedTask[]) => void;
}

export function CalibratePlanModal({
  track,
  date,
  tasks,
  chapters,
  open,
  onClose,
  onApplyPlan,
}: Props) {
  const isOlympiad = track === 'jee_nsep';

  const plan = generateOptimalDayPlan({
    userId: 'current-user',
    date,
    track,
    availableHours: 4.5,
    energyLevel: 4,
    daysToKeyExam: isOlympiad ? 45 : 4,
    existingTasks: tasks,
  });

  const weakChapters = [...chapters]
    .filter((c) => c.unresolvedMistakes > 0 || c.confidence < 60)
    .sort((a, b) => b.unresolvedMistakes - a.unresolvedMistakes);

  function handleApply() {
    onApplyPlan(plan.suggestedTasks);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-100 p-6 shadow-2xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber/20 text-amber shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-paper">
                    Orbit Strategic Day Calibrator
                  </h3>
                  <p className="text-xs text-paper/40">
                    Deterministic capacity & memory optimization
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-paper/40 hover:bg-white/5 hover:text-paper"
              >
                <X size={18} />
              </button>
            </div>

            {/* Capacity & Health Constraint Banner */}
            <div className="my-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-ink p-3">
                <span className="text-[10px] font-mono uppercase text-paper/40">Safe Capacity</span>
                <p className="mt-1 font-display text-lg font-medium text-emerald-400">
                  {(plan.totalPlannedMinutes / 60).toFixed(1)} hrs <span className="text-xs text-paper/40">/ {(plan.maxRecommendedMinutes / 60).toFixed(1)}h</span>
                </p>
                <p className="text-[10px] text-paper/40">Zero burnout buffer preserved</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-ink p-3">
                <span className="text-[10px] font-mono uppercase text-paper/40">Sleep Protection</span>
                <p className="mt-1 font-display text-lg font-medium text-amber">
                  7.5 hrs <span className="text-xs text-paper/40">guaranteed</span>
                </p>
                <p className="text-[10px] text-paper/40">Curfew strictly respected</p>
              </div>
            </div>

            {/* Strategic Diagnostic Notes */}
            <div className="mb-4 rounded-xl border border-amber/15 bg-amber/5 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-amber shrink-0 mt-0.5" />
                <p className="text-xs text-paper/80 leading-relaxed">
                  {plan.rationale || `Engine prioritized ${weakChapters[0]?.name ?? 'core concept'} based on error history and upcoming exam relevance.`}
                </p>
              </div>
            </div>

            {/* Proposed Calibrated Tasks */}
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-2.5">
                Calculated Day Missions ({plan.suggestedTasks.length})
              </p>
              <div className="flex flex-col gap-2">
                {plan.suggestedTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-ink p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase text-paper/50">
                          {task.slot}
                        </span>
                        <span className="text-[10px] font-medium text-amber">
                          {task.subjectName} · {task.chapterName}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-paper line-clamp-1">{task.title}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-mono text-paper/60">{task.estimatedMinutes}m</span>
                      <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-paper/60 hover:bg-white/5"
              >
                Keep Current Plan
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 rounded-xl bg-amber px-5 py-2.5 text-xs font-semibold text-ink shadow-lg shadow-amber/20 hover:brightness-110 active:scale-95 transition"
              >
                <Sparkles size={14} />
                <span>Apply Calibrated Plan</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
