'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  Layers,
} from 'lucide-react';
import {
  getCurriculumChapters,
  getCurriculumSubjects,
  resolveChapterId,
  type CurriculumChapter,
} from '@/lib/curriculumData';
import { getExamLinkedChapters } from '@/api/exams';
import { recordTestAttempt } from '@/api/testAttempts';
import type {
  TestDifficulty,
  TestFumbleFactor,
  RelativeDifficulty,
  SubjectDebriefEntry,
  TrackType,
} from '@/types/database.types';

interface Props {
  userId: string;
  examName?: string;
  examId?: string | null;
  taskId?: string | null;
  initialChapters?: string[];
  track?: TrackType;
  open: boolean;
  onClose: () => void;
  onDebriefCompleted?: () => void;
}

const DIFFICULTY_OPTIONS: { value: TestDifficulty; label: string; desc: string; icon: string }[] = [
  { value: 'easy', label: 'Easy / Scoring', desc: 'Felt straightforward, high scoring', icon: '🟢' },
  { value: 'moderate', label: 'Balanced / Standard', desc: 'Standard exam difficulty, fair mix', icon: '🟡' },
  { value: 'brutal', label: 'Brutal / Lengthy', desc: 'Heavy calculations or tricky traps', icon: '🔴' },
];

const RELATIVE_OPTIONS: { value: RelativeDifficulty; label: string; desc: string }[] = [
  {
    value: 'hard_for_all',
    label: 'Tough for Everyone',
    desc: 'Paper was genuinely hard, cutoffs will be lower',
  },
  {
    value: 'balanced',
    label: 'Standard Benchmark',
    desc: 'Normal distribution, expected exam level',
  },
  {
    value: 'easy_for_others_i_fumbled',
    label: 'Easy for Peers, but I Stumbled',
    desc: 'Missed standard/easy questions that others cracked',
  },
];

const FUMBLE_OPTIONS: { value: TestFumbleFactor; label: string; desc: string; icon: string }[] = [
  {
    value: 'time_panic',
    label: 'Time Panic & Incomplete',
    desc: 'Got stuck early, ran out of time, rushed the end',
    icon: '⏱️',
  },
  {
    value: 'silly_slips',
    label: 'Calculation & Silly Slips',
    desc: 'Knew the method, lost marks to algebra/sign slips',
    icon: '🧮',
  },
  {
    value: 'concept_blindspot',
    label: 'Formula / Concept Blankout',
    desc: 'Froze on formulas or lacked conceptual depth',
    icon: '🧠',
  },
  {
    value: 'in_control',
    label: 'In Full Control',
    desc: 'Executed calmly according to plan',
    icon: '🎯',
  },
];

export function TestDebriefModal({
  userId,
  examName = 'Mock Test Attempt',
  examId = null,
  taskId = null,
  initialChapters = [],
  track,
  open,
  onClose,
  onDebriefCompleted,
}: Props) {
  // 1. Detect effective active track
  const activeTrack: TrackType = useMemo(() => {
    if (track) return track;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
      if (saved) return saved;
    }
    return 'college_cs_aiml';
  }, [track]);

  // 2. Load all curriculum chapters and subjects for this track
  const allCurriculumChapters = useMemo(() => {
    return getCurriculumChapters(activeTrack);
  }, [activeTrack]);

  const allCurriculumSubjects = useMemo(() => {
    return getCurriculumSubjects(activeTrack);
  }, [activeTrack]);

  // 3. State
  const [name, setName] = useState(examName);
  const [examLinkedChapterIds, setExamLinkedChapterIds] = useState<string[]>(initialChapters);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [step, setStep] = useState<number>(1);
  const [activeSubjectTab, setActiveSubjectTab] = useState<number>(0);

  // Overall metrics
  const [overallDifficulty, setOverallDifficulty] = useState<TestDifficulty>('moderate');
  const [overallRelative, setOverallRelative] = useState<RelativeDifficulty>('balanced');
  const [overallFumble, setOverallFumble] = useState<TestFumbleFactor>('silly_slips');
  const [overallScore, setOverallScore] = useState<string>('');
  const [overallMaxScore, setOverallMaxScore] = useState<string>('300');

  // Subject-specific states: Record<subjectName, { difficulty, fumble, score, maxScore, leakedChapters }>
  const [subjectEntries, setSubjectEntries] = useState<
    Record<
      string,
      {
        difficulty: TestDifficulty;
        fumble: TestFumbleFactor;
        score: string;
        maxScore: string;
        leakedChapters: string[];
      }
    >
  >({});

  // Single-subject leaked chapters fallback
  const [singleSubjectLeaked, setSingleSubjectLeaked] = useState<string[]>([]);

  // Student unfiltered space & auto-mistake option
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [autoAddMistakes, setAutoAddMistakes] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync test name
  useEffect(() => {
    if (examName) setName(examName);
  }, [examName]);

  // Load linked chapters if examId is provided
  useEffect(() => {
    if (examId && open) {
      getExamLinkedChapters(examId).then((ids) => {
        if (ids && ids.length > 0) {
          setExamLinkedChapterIds(ids);
        }
      });
    }
  }, [examId, open]);

  // Deduce or populate subjects from linked chapters or initial track
  useEffect(() => {
    if (!open) return;

    if (examLinkedChapterIds.length > 0) {
      const linked = allCurriculumChapters.filter((c) =>
        examLinkedChapterIds.includes(c.id) || examLinkedChapterIds.includes(resolveChapterId(c.id))
      );
      const subs = Array.from(new Set(linked.map((c) => c.subjectName).filter(Boolean)));
      if (subs.length > 0) {
        setSelectedSubjects(subs);
        return;
      }
    }

    // Fallback: If test title mentions a specific subject (e.g. "COA", "Operating Systems", "Physics")
    const titleLower = (name || examName).toLowerCase();
    const matchedSub = allCurriculumSubjects.find((s) =>
      titleLower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(titleLower)
    );
    if (matchedSub) {
      setSelectedSubjects([matchedSub.name]);
    } else {
      // Default: select all subjects of this track (e.g. 3 subjects for JEE, or 2 for CS)
      setSelectedSubjects(allCurriculumSubjects.slice(0, 3).map((s) => s.name));
    }
  }, [examLinkedChapterIds, allCurriculumChapters, allCurriculumSubjects, open, examName, name]);

  // Initialize subject entries state when subjects change
  useEffect(() => {
    setSubjectEntries((prev) => {
      const next: typeof prev = {};
      for (const sub of selectedSubjects) {
        next[sub] = prev[sub] || {
          difficulty: 'moderate',
          fumble: 'silly_slips',
          score: '',
          maxScore: '100',
          leakedChapters: [],
        };
      }
      return next;
    });
  }, [selectedSubjects]);

  const isMultiSubject = selectedSubjects.length > 1;
  const currentSubjectName = selectedSubjects[activeSubjectTab] || selectedSubjects[0] || 'Subject';

  // Chapters belonging to a specific subject from this track
  const getChaptersForSubject = (subName: string) => {
    // If the exam had specific linked chapters, filter only those first
    if (examLinkedChapterIds.length > 0) {
      const examSpecific = allCurriculumChapters.filter(
        (c) =>
          (examLinkedChapterIds.includes(c.id) || examLinkedChapterIds.includes(resolveChapterId(c.id))) &&
          c.subjectName.toLowerCase() === subName.toLowerCase()
      );
      if (examSpecific.length > 0) return examSpecific;
    }
    // Otherwise return all chapters of this subject in the curriculum
    return allCurriculumChapters.filter(
      (c) => c.subjectName.toLowerCase() === subName.toLowerCase()
    );
  };

  const toggleSubjectChapter = (subName: string, chapId: string) => {
    const valid = resolveChapterId(chapId);
    setSubjectEntries((prev) => {
      const current = prev[subName] || {
        difficulty: 'moderate',
        fumble: 'silly_slips',
        score: '',
        maxScore: '100',
        leakedChapters: [],
      };
      const exists = current.leakedChapters.includes(valid);
      const updatedList = exists
        ? current.leakedChapters.filter((id) => id !== valid)
        : [...current.leakedChapters, valid].slice(0, 4);

      return {
        ...prev,
        [subName]: {
          ...current,
          leakedChapters: updatedList,
        },
      };
    });
  };

  const toggleSingleChapter = (chapId: string) => {
    const valid = resolveChapterId(chapId);
    setSingleSubjectLeaked((prev) =>
      prev.includes(valid) ? prev.filter((id) => id !== valid) : [...prev, valid].slice(0, 4)
    );
  };

  // Toggle subject inclusion in test
  const toggleSubjectSelection = (subName: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subName)) {
        if (prev.length <= 1) return prev; // Keep at least 1
        return prev.filter((s) => s !== subName);
      }
      return [...prev, subName];
    });
  };

  // Save Debrief handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const totalScoreNum = overallScore.trim() ? Number(overallScore) : null;
      const totalMaxScoreNum = overallMaxScore.trim() ? Number(overallMaxScore) : null;

      let subjectBreakdown: SubjectDebriefEntry[] | undefined = undefined;
      let allLeakedChapterIds: string[] = [];

      if (isMultiSubject) {
        subjectBreakdown = selectedSubjects.map((subName) => {
          const entry = subjectEntries[subName] || {
            difficulty: 'moderate',
            fumble: 'silly_slips',
            score: '',
            maxScore: '100',
            leakedChapters: [],
          };
          for (const ch of entry.leakedChapters) {
            if (!allLeakedChapterIds.includes(ch)) allLeakedChapterIds.push(ch);
          }
          return {
            subject_name: subName,
            difficulty: entry.difficulty,
            fumble_factor: entry.fumble,
            score: entry.score.trim() ? Number(entry.score) : null,
            max_score: entry.maxScore.trim() ? Number(entry.maxScore) : null,
            leaked_chapter_ids: entry.leakedChapters,
          };
        });
      } else {
        const singleSub = selectedSubjects[0];
        const entry = singleSub ? subjectEntries[singleSub] : null;
        allLeakedChapterIds = entry?.leakedChapters?.length ? entry.leakedChapters : singleSubjectLeaked;
      }

      await recordTestAttempt(userId, {
        exam_id: examId,
        task_id: taskId,
        exam_name: name || examName || 'Test Attempt',
        is_multi_subject: isMultiSubject,
        paper_difficulty: overallDifficulty,
        relative_difficulty: overallRelative,
        fumble_factor: overallFumble,
        score: totalScoreNum,
        max_score: totalMaxScoreNum,
        leaked_chapter_ids: allLeakedChapterIds,
        subject_breakdown: subjectBreakdown,
        student_notes: studentNotes.trim() || null,
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

  // Maximum steps depending on single vs multi subject
  // Multi-subject: Step 1 = Overall, Step 2 = Subject Deep Dive, Step 3 = Student Notes & Finish
  // Single-subject: Step 1 = Subject Feel & Fumble & Leaked Chapters, Step 2 = Student Notes & Finish
  const maxSteps = isMultiSubject ? 3 : 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          className="relative flex flex-col w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/5 p-5 pb-4 bg-ink-50/50">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber">
                <Sparkles size={11} />
                <span>
                  {isMultiSubject ? 'Multi-Subject Test Debrief' : 'Single-Subject Debrief'}
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg font-medium text-paper">
                {isMultiSubject ? (
                  step === 1
                    ? 'Overall Paper Atmosphere'
                    : step === 2
                    ? `Subject Analysis: ${currentSubjectName}`
                    : 'Personal Reflection & Takeaways'
                ) : (
                  step === 1
                    ? `${selectedSubjects[0] || 'Subject'} Performance & Root Causes`
                    : 'Personal Reflection & Takeaways'
                )}
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
          <div className="px-5 pt-3 pb-1 flex items-center gap-1.5">
            {Array.from({ length: maxSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-amber' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Scrollable Body Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* ======================================================== */}
            {/* MULTI-SUBJECT: STEP 1 (Overall Exam Vibe & Total Score)  */}
            {/* ======================================================== */}
            {isMultiSubject && step === 1 && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Test Identifier */}
                <div>
                  <label className="text-xs text-paper/50">Test Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. JEE Main Full Mock #4 or Midsem Exam"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-paper placeholder-paper/20 focus:border-amber focus:outline-none"
                  />
                </div>

                {/* Subject Badges or Selector */}
                {examLinkedChapterIds.length > 0 ? (
                  <div>
                    <label className="text-xs text-paper/50">Subjects in this test</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selectedSubjects.map((s) => (
                        <span
                          key={s}
                          className="rounded-xl bg-amber/10 border border-amber/20 px-3 py-1 text-xs font-semibold text-amber"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-paper/50">Subjects in this test</label>
                      <span className="text-[10px] text-paper/30">Tap to toggle</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {allCurriculumSubjects.map((s) => {
                        const isSel = selectedSubjects.includes(s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSubjectSelection(s.name)}
                            className={`rounded-lg px-2.5 py-1 text-xs transition ${
                              isSel
                                ? 'bg-amber text-ink font-semibold shadow-sm'
                                : 'border border-white/10 bg-white/5 text-paper/50 hover:text-paper'
                            }`}
                          >
                            {isSel ? '✓ ' : '+ '}
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Overall Difficulty */}
                <div>
                  <label className="text-xs text-paper/50">Overall paper difficulty</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOverallDifficulty(opt.value)}
                        className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                          overallDifficulty === opt.value
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

                {/* Peer Baseline */}
                <div>
                  <label className="text-xs text-paper/50">Compared to peers / standard exams:</label>
                  <div className="mt-2 flex flex-col gap-2">
                    {RELATIVE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOverallRelative(opt.value)}
                        className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left transition ${
                          overallRelative === opt.value
                            ? 'border-amber bg-amber/10 text-paper'
                            : 'border-white/5 bg-white/[0.02] text-paper/60 hover:border-white/15'
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                            overallRelative === opt.value ? 'border-amber bg-amber' : 'border-white/30'
                          }`}
                        >
                          {overallRelative === opt.value && <div className="h-1.5 w-1.5 rounded-full bg-ink" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-paper">{opt.label}</p>
                          <p className="text-[11px] text-paper/40">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total Marks */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs text-paper/50 mb-2">Total Score (Optional)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={overallScore}
                      onChange={(e) => setOverallScore(e.target.value)}
                      placeholder="Marks"
                      className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center font-mono text-sm text-paper focus:border-amber focus:outline-none"
                    />
                    <span className="text-paper/30 font-mono">/</span>
                    <input
                      type="number"
                      value={overallMaxScore}
                      onChange={(e) => setOverallMaxScore(e.target.value)}
                      placeholder="300"
                      className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center font-mono text-sm text-paper focus:border-amber focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* MULTI-SUBJECT: STEP 2 (Subject-by-Subject Deep Dive)     */}
            {/* ======================================================== */}
            {isMultiSubject && step === 2 && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Subject Tabs Navigation */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/5">
                  {selectedSubjects.map((sub, idx) => {
                    const isTabActive = activeSubjectTab === idx;
                    const hasData =
                      (subjectEntries[sub]?.leakedChapters.length || 0) > 0 ||
                      Boolean(subjectEntries[sub]?.score);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setActiveSubjectTab(idx)}
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          isTabActive
                            ? 'bg-amber text-ink shadow-sm'
                            : 'border border-white/10 bg-white/5 text-paper/60 hover:text-paper'
                        }`}
                      >
                        <span>{sub}</span>
                        {hasData && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isTabActive ? 'bg-ink' : 'bg-amber'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Subject Details */}
                {(() => {
                  const currentSub = currentSubjectName;
                  const entry = subjectEntries[currentSub] || {
                    difficulty: 'moderate',
                    fumble: 'silly_slips',
                    score: '',
                    maxScore: '100',
                    leakedChapters: [],
                  };
                  const subChapters = getChaptersForSubject(currentSub);

                  return (
                    <div className="space-y-4">
                      {/* Subject Difficulty */}
                      <div>
                        <label className="text-xs text-paper/50">
                          How was <span className="text-amber font-semibold">{currentSub}</span> in this test?
                        </label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {DIFFICULTY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setSubjectEntries((prev) => ({
                                  ...prev,
                                  [currentSub]: { ...entry, difficulty: opt.value },
                                }))
                              }
                              className={`flex flex-col items-start rounded-2xl border p-2.5 text-left transition ${
                                entry.difficulty === opt.value
                                  ? 'border-amber bg-amber/10 text-paper'
                                  : 'border-white/5 bg-white/[0.02] text-paper/60 hover:border-white/15'
                              }`}
                            >
                              <span className="text-sm">{opt.icon}</span>
                              <span className="mt-1 text-xs font-semibold">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* What hurt you in this subject? */}
                      <div>
                        <label className="text-xs text-paper/50">
                          What hurt your marks most in {currentSub}?
                        </label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {FUMBLE_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setSubjectEntries((prev) => ({
                                  ...prev,
                                  [currentSub]: { ...entry, fumble: opt.value },
                                }))
                              }
                              className={`flex items-start gap-2.5 rounded-2xl border p-2.5 text-left transition ${
                                entry.fumble === opt.value
                                  ? 'border-amber bg-amber/10 text-paper'
                                  : 'border-white/5 bg-white/[0.02] text-paper/60 hover:border-white/15'
                              }`}
                            >
                              <span className="text-base">{opt.icon}</span>
                              <div>
                                <p className="text-xs font-semibold text-paper">{opt.label}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Leaked chapters inside this subject */}
                      <div>
                        <label className="text-xs text-paper/50">
                          Which chapters in <span className="text-amber">{currentSub}</span> leaked marks? (Tap to pick)
                        </label>
                        <div className="mt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {subChapters.map((ch) => {
                            const isSelected = entry.leakedChapters.includes(ch.id);
                            return (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() => toggleSubjectChapter(currentSub, ch.id)}
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

                      {/* Optional Subject Score */}
                      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex items-center justify-between">
                        <span className="text-xs text-paper/50">{currentSub} Marks (Optional)</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={entry.score}
                            onChange={(e) =>
                              setSubjectEntries((prev) => ({
                                ...prev,
                                [currentSub]: { ...entry, score: e.target.value },
                              }))
                            }
                            placeholder="Marks"
                            className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-xs text-paper focus:border-amber focus:outline-none"
                          />
                          <span className="text-paper/30 font-mono text-xs">/</span>
                          <input
                            type="number"
                            value={entry.maxScore}
                            onChange={(e) =>
                              setSubjectEntries((prev) => ({
                                ...prev,
                                [currentSub]: { ...entry, maxScore: e.target.value },
                              }))
                            }
                            placeholder="100"
                            className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-xs text-paper focus:border-amber focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Next Subject Button in Tab */}
                      {activeSubjectTab < selectedSubjects.length - 1 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveSubjectTab((t) => t + 1)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-paper/70 hover:text-paper hover:bg-white/10 transition"
                          >
                            Next Subject: {selectedSubjects[activeSubjectTab + 1]} ➔
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* SINGLE SUBJECT: STEP 1 (Direct Subject Analysis)         */}
            {/* ======================================================== */}
            {!isMultiSubject && step === 1 && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Test Identifier */}
                <div>
                  <label className="text-xs text-paper/50">Test Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. COA Midsem Exam / Systems Quiz"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-paper placeholder-paper/20 focus:border-amber focus:outline-none"
                  />
                </div>

                {/* Subject Indicator */}
                {examLinkedChapterIds.length > 0 ? (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs text-paper/50">Subject:</span>
                    <span className="text-xs font-semibold text-amber">
                      {selectedSubjects[0] || 'Linked Subject'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-paper/50">Subject</label>
                      <span className="text-[10px] text-paper/30">Tap to select</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {allCurriculumSubjects.map((s) => {
                        const isSel = selectedSubjects[0] === s.name;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedSubjects([s.name])}
                            className={`rounded-lg px-2.5 py-1 text-xs transition ${
                              isSel
                                ? 'bg-amber text-ink font-semibold'
                                : 'border border-white/10 bg-white/5 text-paper/50 hover:text-paper'
                            }`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Difficulty */}
                <div>
                  <label className="text-xs text-paper/50">How did the paper feel overall?</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOverallDifficulty(opt.value)}
                        className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                          overallDifficulty === opt.value
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

                {/* What hurt you? */}
                <div>
                  <label className="text-xs text-paper/50">What hurt your score the most?</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {FUMBLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOverallFumble(opt.value)}
                        className={`flex items-start gap-2.5 rounded-2xl border p-2.5 text-left transition ${
                          overallFumble === opt.value
                            ? 'border-amber bg-amber/10 text-paper'
                            : 'border-white/5 bg-white/[0.02] text-paper/60 hover:border-white/15'
                        }`}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-paper">{opt.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leaked Chapters from this Subject Syllabus */}
                <div>
                  <label className="text-xs text-paper/50">
                    Which chapters in <span className="text-amber">{selectedSubjects[0] || 'this subject'}</span> leaked marks?
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {getChaptersForSubject(selectedSubjects[0] || '').map((ch) => {
                      const isSelected = singleSubjectLeaked.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleSingleChapter(ch.id)}
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

                {/* Optional Score */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex items-center justify-between">
                  <span className="text-xs text-paper/50">Score (Optional)</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={overallScore}
                      onChange={(e) => setOverallScore(e.target.value)}
                      placeholder="Marks"
                      className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-xs text-paper focus:border-amber focus:outline-none"
                    />
                    <span className="text-paper/30 font-mono text-xs">/</span>
                    <input
                      type="number"
                      value={overallMaxScore}
                      onChange={(e) => setOverallMaxScore(e.target.value)}
                      placeholder="100"
                      className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-xs text-paper focus:border-amber focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* FINAL STEP: STUDENT UNFILTERED SPACE & NEXT ACTION       */}
            {/* ======================================================== */}
            {step === maxSteps && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Free-form Blank Space */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-paper/70 font-semibold mb-1">
                    <MessageSquare size={13} className="text-amber" />
                    <span>Your Unfiltered Space (Speak your mind)</span>
                  </div>
                  <p className="text-[11px] text-paper/40 mb-2">
                    Write anything important without hesitation: distractions, anxiety, exam hall issues,
                    surprises in the paper, or what you felt went wrong. The AI and your future self will use this.
                  </p>
                  <textarea
                    rows={4}
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    placeholder="e.g. I spent 40 mins on Question 3 and panicked in the last 20 mins. The invigilator made announcements that broke my focus. I knew pipelining theory well but got confused with branch delay slots..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-paper placeholder-paper/20 focus:border-amber focus:outline-none leading-relaxed resize-none"
                  />
                </div>

                {/* Auto-enroll in Mistake Book toggle */}
                <label className="flex items-start gap-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAddMistakes}
                    onChange={(e) => setAutoAddMistakes(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 text-amber focus:ring-0"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-paper">Auto-enroll leaked chapters in Mistake Book</p>
                    <p className="text-[11px] text-paper/40">
                      Orbit will automatically prioritize these chapters and tag them with their specific root causes
                      for your next study plan.
                    </p>
                  </div>
                </label>
              </motion.div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between border-t border-white/5 p-4 px-5 bg-ink-50/50">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
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

            {step < maxSteps ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
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
