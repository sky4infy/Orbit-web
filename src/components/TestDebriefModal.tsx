'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, BookmarkPlus, Zap } from 'lucide-react';
import { getCurriculumChapters, resolveChapterId, type CurriculumChapter } from '@/lib/curriculumData';
import { recordTestAttempt } from '@/api/testAttempts';
import type {
  TestDifficulty,
  TestFumbleFactor,
  RelativeDifficulty,
} from '@/types/database.types';

interface Props {
  userId: string;
  examName?: string;
  examId?: string | null;
  taskId?: string | null;
  initialChapters?: string[];
  open: boolean;
  onClose: () => void;
  onDebriefCompleted?: () => void;
}

const DIFFICULTY_OPTIONS: { value: TestDifficulty; label: string; desc: string; icon: string }[] = [
  { value: 'easy', label: 'Easy / Scoring', desc: 'Felt straightforward, high scoring potential', icon: '🟢' },
  { value: 'moderate', label: 'Balanced / Standard', desc: 'Standard exam difficulty, fair distribution', icon: '🟡' },
  { value: 'brutal', label: 'Brutal / Lengthy', desc: 'Very heavy calculations or tricky problems', icon: '🔴' },
];

const RELATIVE_OPTIONS: { value: RelativeDifficulty; label: string; desc: string }[] = [
  {
    value: 'hard_for_all',
    label: 'Tough for Everyone',
    desc: 'General cutoff will be low, paper was genuinely difficult',
  },
  {
    value: 'balanced',
    label: 'Standard Benchmark',
    desc: 'Normal peer level, balanced question mix',
  },
  {
    value: 'easy_for_others_i_fumbled',
    label: 'Easy for Peers, but I Stumbled',
    desc: 'Missed standard/easy questions that others scored on',
  },
];

const FUMBLE_OPTIONS: { value: TestFumbleFactor; label: string; desc: string; icon: string }[] = [
  {
    value: 'time_panic',
    label: 'Time Panic & Incomplete',
    desc: 'Got stuck early, ran out of time, rushed the final hour',
    icon: '⏱️',
  },
  {
    value: 'silly_slips',
    label: 'Calculation & Silly Slips',
    desc: 'Knew how to solve, but made sign/calculation/reading errors',
    icon: '🧮',
  },
  {
    value: 'concept_blindspot',
    label: 'Formula / Concept Blankout',
    desc: 'Froze on formulas or lacked conceptual depth in key questions',
    icon: '🧠',
  },
  {
    value: 'in_control',
    label: 'In Full Control',
    desc: 'Strategy executed calmly according to plan',
    icon: '🎯',
  },
];

export function TestDebriefModal({
  userId,
  examName = 'Mock Test Attempt',
  examId = null,
  taskId = null,
  initialChapters = [],
  open,
  onClose,
  onDebriefCompleted,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(examName);
  const [difficulty, setDifficulty] = useState<TestDifficulty>('moderate');
  const [relativeDiff, setRelativeDiff] = useState<RelativeDifficulty>('balanced');
  const [fumble, setFumble] = useState<TestFumbleFactor>('silly_slips');
  const [score, setScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('300');
  const [selectedChapters, setSelectedChapters] = useState<string[]>(initialChapters);
  const [autoAddMistakes, setAutoAddMistakes] = useState(true);
  const [chapterSearch, setChapterSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync examName if passed
  useEffect(() => {
    if (examName) setName(examName);
  }, [examName]);

  // Load all curriculum chapters for fast tagging
  const allChapters = useMemo(() => {
    return getCurriculumChapters('all');
  }, []);

  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) {
      return allChapters.slice(0, 8);
    }
    const q = chapterSearch.toLowerCase();
    return allChapters
      .filter((c) => c.name.toLowerCase().includes(q) || c.subjectName.toLowerCase().includes(q))
      .slice(0, 10);
  }, [allChapters, chapterSearch]);

  const toggleChapter = (chapId: string) => {
    const valid = resolveChapterId(chapId);
    setSelectedChapters((prev) =>
      prev.includes(valid) ? prev.filter((id) => id !== valid) : [...prev, valid].slice(0, 4)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedScore = score.trim() ? Number(score) : null;
      const parsedMax = maxScore.trim() ? Number(maxScore) : null;

      await recordTestAttempt(userId, {
        exam_id: examId,
        task_id: taskId,
        exam_name: name || 'Mock Test Attempt',
        paper_difficulty: difficulty,
        relative_difficulty: relativeDiff,
        fumble_factor: fumble,
        score: parsedScore,
        max_score: parsedMax,
        leaked_chapter_ids: selectedChapters,
        autoCreateMistakes: autoAddMistakes,
      });

      onDebriefCompleted?.();
      onClose();
    } catch (err) {
      console.error('Failed to save test debrief:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-ink p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/5 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber">
                <Sparkles size={11} />
                <span>Post-Test Micro-Debrief (20s)</span>
              </div>
              <h2 className="mt-1 font-display text-lg font-medium text-paper">
                {step === 1 && 'Paper Atmosphere & Benchmark'}
                {step === 2 && 'Execution & Emotional State'}
                {step === 3 && 'Weak Spots & Mistake Tagging'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-paper/40 transition hover:bg-white/5 hover:text-paper"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-amber' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Paper Atmosphere */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="text-xs text-paper/50">Test Name / Identifier</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Allen Leader Test #3"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-paper placeholder-paper/20 focus:border-amber focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-paper/50">How did the paper feel overall?</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDifficulty(opt.value)}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                        difficulty === opt.value
                          ? 'border-amber bg-amber/10 text-paper'
                          : 'border-white/5 bg-white/[0.02] text-paper/60 hover:border-white/15'
                      }`}
                    >
                      <span className="text-base">{opt.icon}</span>
                      <span className="mt-1 text-xs font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-paper/50">Compared to peers / standard exams:</label>
                <div className="mt-2 flex flex-col gap-2">
                  {RELATIVE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRelativeDiff(opt.value)}
                      className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left transition ${
                        relativeDiff === opt.value
                          ? 'border-amber bg-amber/10 text-paper'
                          : 'border-white/5 bg-white/[0.02] text-paper/60 hover:border-white/15'
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                          relativeDiff === opt.value ? 'border-amber bg-amber' : 'border-white/30'
                        }`}
                      >
                        {relativeDiff === opt.value && <div className="h-1.5 w-1.5 rounded-full bg-ink" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-paper">{opt.label}</p>
                        <p className="text-[11px] text-paper/40">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Execution & Emotional State */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="text-xs text-paper/50">What hurt your score the most?</label>
                <p className="text-[11px] text-paper/30">Select the primary root cause of lost marks</p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {FUMBLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFumble(opt.value)}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                        fumble === opt.value
                          ? 'border-amber bg-amber/10 shadow-sm'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <div className="flex-1">
                        <p
                          className={`text-xs font-semibold ${
                            fumble === opt.value ? 'text-amber' : 'text-paper'
                          }`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-paper/40 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Weak Topics & Mistake Book */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="text-xs text-paper/50">
                  Which 1–3 topics leaked the most marks? (Tap to select)
                </label>
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Search chapters (e.g. Rotational, Thermodynamics)..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-paper placeholder-paper/20 focus:border-amber focus:outline-none"
                />

                {/* Chapter chips */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {filteredChapters.map((ch) => {
                    const isSelected = selectedChapters.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChapter(ch.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                          isSelected
                            ? 'bg-amber text-ink font-semibold'
                            : 'border border-white/10 bg-white/5 text-paper/60 hover:text-paper'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {ch.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Mistake Checkbox */}
              <label className="flex items-start gap-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAddMistakes}
                  onChange={(e) => setAutoAddMistakes(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-amber focus:ring-0"
                />
                <div className="text-xs">
                  <p className="font-semibold text-paper">Auto-enroll in Mistake Book & Spaced Repetition</p>
                  <p className="text-[11px] text-paper/40">
                    Orbit will automatically prioritize these chapters in your next study cycle.
                  </p>
                </div>
              </label>

              {/* Optional Score Section */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-xs text-paper/50 mb-2">Score (Optional — leave blank if not checked yet)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Marks"
                    className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center font-mono text-sm text-paper focus:border-amber focus:outline-none"
                  />
                  <span className="text-paper/30 font-mono">/</span>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="300"
                    className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center font-mono text-sm text-paper focus:border-amber focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer Controls */}
          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="inline-flex items-center gap-1.5 text-xs text-paper/40 transition hover:text-paper"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-paper/40 transition hover:text-paper"
              >
                Skip / Later
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber px-4 py-2 text-xs font-semibold text-ink shadow-md shadow-amber/20 hover:brightness-110 transition"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber px-5 py-2 text-xs font-semibold text-ink shadow-md shadow-amber/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{saving ? 'Saving...' : 'Finish Debrief'}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
