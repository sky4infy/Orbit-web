'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronDown, ChevronUp, Zap, Clock, Check, X, ArrowRight, ShieldAlert, Target } from 'lucide-react';
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
  onApplyPlan?: (suggested: SuggestedTask[]) => void;
  onOpenFocusTimer?: (task: TaskWithChapter | null) => void;
}

export function AiMentorCard({ userId = '', track, date, tasks, chapters, onApplyPlan, onOpenFocusTimer }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [calibratedPlan, setCalibratedPlan] = useState<PlanningEngineOutput | null>(null);
  const [academicState, setAcademicState] = useState<UnifiedStudentState | null>(null);

  const isOlympiadTrack = track === 'jee_nsep';

  useEffect(() => {
    getUnifiedAcademicState(userId, track)
      .then((st) => setAcademicState(st))
      .catch((err) => console.warn('Failed to fetch academic state for mentor card:', err));
  }, [userId, track, tasks]);

  // Find highest priority weak chapters from live academic memory or props fallback
  const topWeakChapter = academicState?.chapters[0]?.name ?? (
    chapters.find((c) => c.unresolvedMistakes > 0 || c.confidence < 60)?.name ??
    (isOlympiadTrack ? 'Rotational Dynamics' : 'Dynamic Programming')
  );

  const totalUnresolvedMistakes =
    academicState?.summary.totalUnresolvedMistakes ??
    chapters.reduce((sum, c) => sum + c.unresolvedMistakes, 0);

  const conceptualCount = academicState?.summary.conceptualMistakesCount ?? 0;
  const targetExam = academicState?.targetExam;
  const cognitive = academicState?.cognitiveProfile;

  // Calculate planned minutes
  const totalPlannedMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 45), 0);
  const plannedHours = (totalPlannedMinutes / 60).toFixed(1);

  // Mentor Advice calculation
  const headline = isOlympiadTrack
    ? 'STEM & Olympiad Strategic Calibration'
    : 'Computer Science & Systems Calibration';

  let primaryRecommendation = '';
  if (cognitive?.fatigueRisk) {
    primaryRecommendation = `🛡️ Fatigue Shield Active: ${cognitive.reportedSleep}h sleep recorded (7-day avg: ${cognitive.sevenDayAvgSleep}h). Orbit has scaled recommended study to ${cognitive.recommendedStudyHours}h to protect cognitive recovery. Priority #1 is clearing ${topWeakChapter} without overworking.`;
  } else if (targetExam && targetExam.daysRemaining <= 30) {
    primaryRecommendation = `Target Milestone: ${targetExam.name} is in ${targetExam.daysRemaining} days. Priority #1 is ${topWeakChapter} (${totalUnresolvedMistakes} active errors to clear). Keep evening work focused on timed drills.`;
  } else if (isOlympiadTrack) {
    primaryRecommendation = `You have ${totalUnresolvedMistakes} active error points logged (${conceptualCount} conceptual). Priority #1 is ${topWeakChapter} (focus on multi-concept analytical derivations). Keep evening self-study to 3.5 hrs max so you get 7.5 hrs of sleep.`;
  } else {
    primaryRecommendation = `Upcoming contest and architecture sprint ahead. Priority #1 is ${topWeakChapter} (review core pattern variations). Block an uninterrupted deep work session for Systems/PyTorch before midnight.`;
  }

  const mentorQuestions = isOlympiadTrack
    ? [
        {
          q: 'Why prioritize analytical problem solving over reading early?',
          a: 'Olympiad and competitive exams test conceptual depth and mathematical fluency that fade faster than descriptive theory. Tackling complex mechanics and calculus while your cognitive energy is peak ensures maximum retention.',
        },
        {
          q: 'What if classes or lectures overrun and I fall behind schedule?',
          a: 'Zero guilt. Orbit automatically prioritizes your single most critical concept set and reschedules secondary reading to tomorrow. Protecting sleep is non-negotiable.',
        },
        {
          q: 'How to stop silly calculation mistakes under time pressure?',
          a: 'Do not rush the final algebraic simplification. Write units beside each intermediate step and double check signs before ticking the boxes.',
        },
      ]
    : [
        {
          q: 'How should I balance DSA with AI/ML project work?',
          a: 'Use the 60/40 rule: 1 focused 50m block on algorithm patterns (active recall), followed by a 90m deep work block building and debugging your system architecture.',
        },
        {
          q: 'My loss isn\'t converging in PyTorch, what is the fastest diagnosis?',
          a: 'Check learning rate (try 10x smaller), verify input normalization (zero mean, unit variance), and overfit on a tiny 5-sample batch first to verify architecture sanity.',
        },
        {
          q: 'How do I retain complex graph and DP patterns long-term?',
          a: 'Focus on the state transition invariant, not the code. Re-derive the recurrence relation on paper after 3 days and 7 days.',
        },
      ];

  function handleOpenCalibration() {
    const plan = generateOptimalDayPlan({
      userId: userId || 'local-user',
      date,
      track,
      existingTasks: tasks,
      academicState: academicState ?? undefined,
    });
    setCalibratedPlan(plan);
    setCalibrationModalOpen(true);
  }

  function handleApply() {
    if (calibratedPlan && onApplyPlan) {
      onApplyPlan(calibratedPlan.suggestedTasks);
    }
    setCalibrationModalOpen(false);
  }

  return (
    <>
      <div className="mb-6 rounded-3xl border border-amber/20 bg-gradient-to-br from-amber/10 via-ink-50 to-ink p-5 shadow-xl backdrop-blur-md">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber text-ink shadow-md shadow-amber/20">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-semibold text-paper">{headline}</h2>
                <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-mono font-medium text-amber">
                  AI Mentor
                </span>
              </div>
              <p className="text-xs text-paper/50">Adaptive guidance • Zero-debt planning</p>
            </div>
          </div>

          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-full p-1.5 text-paper/40 transition hover:bg-white/10 hover:text-paper"
            aria-label="Toggle Mentor"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Core Tactical Recommendation */}
        <div className="mt-3.5 rounded-2xl border border-white/5 bg-ink/60 p-3.5">
          <p className="text-xs leading-relaxed text-paper/90">
            <span className="font-semibold text-amber">Strategic Advice: </span>
            {primaryRecommendation}
          </p>

          {/* Diagnostic Meta Bar */}
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-paper/50 font-mono">
            <span>Target Load: {plannedHours} hrs</span>
            <span>Focus: {topWeakChapter}</span>
            {targetExam && (
              <span className="text-amber">
                {targetExam.daysRemaining}d to {targetExam.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        {/* 1-Tap Auto-Calibrate Action Button */}
        <div className="mt-3.5 flex items-center justify-between">
          <button
            onClick={handleOpenCalibration}
            className="flex items-center gap-2 rounded-xl bg-amber/15 px-3.5 py-2 text-xs font-semibold text-amber ring-1 ring-amber/30 transition hover:bg-amber/25"
          >
            <Zap size={14} className="fill-amber" />
            <span>Auto-Calibrate Today's Plan</span>
          </button>

          <span className="text-[11px] text-paper/40">Zero-overload engine</span>
        </div>

        {/* Expanded Interactive Coaching Q&A */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-col gap-2.5 border-t border-white/10 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber">
                  Mentor Diagnostics & Strategy
                </span>

                {mentorQuestions.map((item, idx) => {
                  const isOpen = activeQuestion === item.q;
                  return (
                    <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                      <button
                        onClick={() => setActiveQuestion(isOpen ? null : item.q)}
                        className="flex w-full items-center justify-between text-left text-xs font-medium text-paper/80 hover:text-paper"
                      >
                        <span>{item.q}</span>
                        <span className="text-amber ml-2">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <p className="mt-2 text-[11px] leading-relaxed text-paper/60 border-t border-white/5 pt-2">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Auto-Calibration Preview Modal */}
      <AnimatePresence>
        {calibrationModalOpen && calibratedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCalibrationModalOpen(false)}
              className="absolute inset-0 bg-ink/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-b from-ink-50 to-ink p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-paper flex items-center gap-2">
                    <Sparkles size={18} className="text-amber" /> Calibrated Day Plan
                  </h3>
                  <p className="text-xs text-paper/50">Mathematical priority • Anti-guilt time physics</p>
                </div>
                <button
                  onClick={() => setCalibrationModalOpen(false)}
                  className="rounded-full p-1.5 text-paper/40 hover:bg-white/10 hover:text-paper"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Rationale Banner */}
              <div className="mb-5 rounded-2xl border border-amber/20 bg-amber/10 p-3.5 text-xs text-paper/80 leading-relaxed">
                <p className="font-semibold text-amber mb-1">Architecture Rationale:</p>
                {calibratedPlan.rationale}
              </div>

              {/* Slotted Tasks Preview */}
              <div className="flex flex-col gap-2.5 mb-6">
                {calibratedPlan.suggestedTasks.map((t, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/5 bg-ink/60 p-3.5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono uppercase font-bold text-amber text-[10px]">
                        {t.slot} • {t.estimatedMinutes}m
                      </span>
                      <span className="text-paper/40 text-[10px]">{t.subjectName}</span>
                    </div>
                    <p className="text-sm font-medium text-paper">{t.title}</p>
                    <p className="text-[11px] text-paper/50 mt-1 italic">Why: {t.reason}</p>
                  </div>
                ))}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApply}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber py-3.5 text-sm font-semibold text-ink shadow-lg hover:brightness-110"
                >
                  <Check size={16} />
                  <span>Apply to Orbit Today</span>
                </button>
                <button
                  onClick={() => setCalibrationModalOpen(false)}
                  className="rounded-2xl bg-white/5 px-4 py-3.5 text-xs font-semibold text-paper/60 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
