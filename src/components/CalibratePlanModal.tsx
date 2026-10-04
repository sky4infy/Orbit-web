'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Clock, AlertTriangle, ArrowRight, ShieldCheck, Target, BatteryCharging } from 'lucide-react';
import type { TrackType } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';
import { generateOptimalDayPlan, type PlanningEngineOutput, type SuggestedTask } from '@/lib/planningEngine';
import { getUnifiedAcademicState, type UnifiedStudentState } from '@/lib/academicState';

interface Props {
  userId?: string;
  track: TrackType;
  date: string;
  tasks: TaskWithChapter[];
  chapters: { id: string; name: string; unresolvedMistakes: number; confidence: number; subjectName: string }[];
  open: boolean;
  onClose: () => void;
  onApplyPlan: (suggested: SuggestedTask[]) => void;
}

export function CalibratePlanModal({
  userId = '',
  track,
  date,
  tasks,
  chapters,
  open,
  onClose,
  onApplyPlan,
}: Props) {
  const [academicState, setAcademicState] = useState<UnifiedStudentState | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanningEngineOutput | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    getUnifiedAcademicState(userId, track)
      .then((state) => {
        setAcademicState(state);
        const calibrated = generateOptimalDayPlan({
          userId: userId || 'local-user',
          date,
          track,
          existingTasks: tasks,
          academicState: state,
        });
        setPlan(calibrated);
      })
      .catch((err) => {
        console.error('Failed to get unified academic state:', err);
        const fallback = generateOptimalDayPlan({
          userId: userId || 'local-user',
          date,
          track,
          existingTasks: tasks,
        });
        setPlan(fallback);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, userId, track, date, tasks]);

  function handleApply() {
    if (plan) {
      onApplyPlan(plan.suggestedTasks);
    }
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
                    Live academic memory • Zero-debt planning
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

            {loading && !plan ? (
              <div className="py-16 text-center text-xs text-paper/40">
                <Sparkles size={24} className="mx-auto mb-2 text-amber animate-spin" />
                Aggregating academic state & computing optimal schedule…
              </div>
            ) : plan ? (
              <>
                {/* Capacity & Target Exam Milestone Banner */}
                <div className="my-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-ink p-3">
                    <span className="text-[10px] font-mono uppercase text-paper/40">Planned Load</span>
                    <p className="mt-1 font-display text-lg font-medium text-emerald-400">
                      {(plan.totalPlannedMinutes / 60).toFixed(1)}h <span className="text-xs text-paper/40">/ {(plan.maxRecommendedMinutes / 60).toFixed(1)}h max</span>
                    </p>
                    <p className="text-[10px] text-paper/40">
                      {academicState?.cognitiveProfile?.fatigueRisk ? '🛡️ Scaled for recovery' : 'Energy capacity verified'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-ink p-3">
                    <span className="text-[10px] font-mono uppercase text-paper/40">Exam Proximity</span>
                    <p className="mt-1 font-display text-base font-semibold text-amber truncate">
                      {academicState?.targetExam ? `${academicState.targetExam.daysRemaining} days` : '45 days'}
                    </p>
                    <p className="text-[10px] text-paper/40 truncate">
                      {academicState?.targetExam?.name ?? 'Key Exam Target'}
                    </p>
                  </div>
                </div>

                {/* Fatigue Shield Alert if active */}
                {academicState?.cognitiveProfile?.fatigueRisk && (
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber/30 bg-amber/10 p-3 text-xs text-amber">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>
                      {academicState.cognitiveProfile.overloadWarning || 'Sleep deficit detected. Workload calibrated to prevent burnout.'}
                    </span>
                  </div>
                )}

                {/* Strategic Diagnostic Notes */}
                <div className="mb-4 rounded-xl border border-amber/15 bg-amber/5 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck size={16} className="text-amber shrink-0 mt-0.5" />
                    <p className="text-xs text-paper/80 leading-relaxed">
                      {plan.rationale}
                    </p>
                  </div>
                </div>

                {/* Proposed Calibrated Tasks */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/40">
                      Calculated Day Missions ({plan.suggestedTasks.length})
                    </p>
                    <span className="text-[10px] font-mono text-paper/40">
                      {academicState?.summary.totalUnresolvedMistakes ?? 0} active errors targeted
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {plan.suggestedTasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/5 bg-ink p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase font-bold text-amber">
                              {task.slot}
                            </span>
                            <span className="text-[10px] text-paper/50">
                              {task.subjectName} · {task.chapterName}
                            </span>
                          </div>
                          <span className="font-mono text-paper/60">{task.estimatedMinutes}m</span>
                        </div>
                        <p className="font-medium text-paper">{task.title}</p>
                        <p className="mt-1 text-[11px] text-paper/50 italic">
                          Why: {task.reason}
                        </p>
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
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
