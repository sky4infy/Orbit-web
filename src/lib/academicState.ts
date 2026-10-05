import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import type { TrackType, ChapterStatus, Difficulty, MistakeType } from '@/types/database.types';
import {
  db,
  getLocalMistakes,
  getLocalExams,
  getLocalRevisions,
  getRecentLocalReflections,
  type LocalMistake,
  type LocalExam,
  type LocalRevision,
  type LocalReflection,
} from '@/lib/db';
import { getCurriculumChapters, getChapterOverrides, type CurriculumChapter } from '@/lib/curriculumData';

export type WeightageTier = 'tier1_heavy' | 'tier2_core' | 'tier3_foundational';

export interface ChapterWeightageInfo {
  tier: WeightageTier;
  weightagePercent: number; // e.g., 12 means ~12% of subject/exam marks
}

export interface ChapterMistakeStats {
  total: number;
  unresolved: number;
  conceptual: number;
  calculation: number;
  silly: number;
  timePressure: number;
  other: number;
  hard: number;
}

export interface UnifiedChapterState {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  track: TrackType;
  status: ChapterStatus;
  confidence: number;
  mistakes: ChapterMistakeStats;
  isRevisionDue: boolean;
  isExamTargeted: boolean;
  tier: WeightageTier;
  weightagePercent: number;
  effectivePriorityScore: number;
}

export interface TargetExamContext {
  id: string;
  name: string;
  examType: string;
  examDate: string;
  daysRemaining: number;
  isTargetingTrack: boolean;
  targetedChapterCount: number;
  targetSubjectName?: string | null;
}

export interface CognitiveCapacityProfile {
  reportedEnergy: number; // 1 to 5 (from reflection or default 4)
  reportedSleep: number; // in hours, default 7.5
  sevenDayAvgSleep: number;
  energyMultiplier: number; // 0.6 to 1.0
  recommendedStudyHours: number;
  fatigueRisk: boolean;
  overloadWarning: string | null;
  recentSkipTrends: Record<string, number>;
  latestBlockers: string | null;
}

export interface UnifiedStudentState {
  userId: string;
  activeTrack: TrackType;
  chapters: UnifiedChapterState[];
  targetExam: TargetExamContext | null;
  cognitiveProfile: CognitiveCapacityProfile;
  summary: {
    totalChapters: number;
    masteredCount: number;
    practicingCount: number;
    learningCount: number;
    revisionDueCount: number;
    notStartedCount: number;
    averageConfidence: number;
    totalUnresolvedMistakes: number;
    conceptualMistakesCount: number;
  };
}

// ============================================================
// CURRICULUM WEIGHTAGE MAPPINGS (JEE & STEM Olympiad + CS)
// ============================================================

export const CHAPTER_WEIGHTAGES: Record<string, ChapterWeightageInfo> = {
  // JEE Physics
  'jee-phy-6': { tier: 'tier1_heavy', weightagePercent: 12 }, // Rotational Dynamics (NSEP high-weightage)
  'jee-phy-3': { tier: 'tier1_heavy', weightagePercent: 8 },  // Kinematics
  'jee-phy-4': { tier: 'tier1_heavy', weightagePercent: 8 },  // NLM & Friction
  'jee-phy-7': { tier: 'tier1_heavy', weightagePercent: 9 },  // COM & Collisions
  'jee-phy-10': { tier: 'tier1_heavy', weightagePercent: 10 }, // Thermodynamics
  'jee-phy-5': { tier: 'tier2_core', weightagePercent: 7 },   // Work Energy Power
  'jee-phy-11': { tier: 'tier2_core', weightagePercent: 6 },  // SHM
  'jee-phy-12': { tier: 'tier2_core', weightagePercent: 6 },  // Waves & Sound
  'jee-phy-9': { tier: 'tier2_core', weightagePercent: 6 },   // Fluids
  'jee-phy-2': { tier: 'tier2_core', weightagePercent: 5 },   // Vectors & Calculus
  'jee-phy-1': { tier: 'tier3_foundational', weightagePercent: 3 }, // Units & Errors
  'jee-phy-8': { tier: 'tier3_foundational', weightagePercent: 4 }, // Gravitation

  // JEE Chemistry
  'jee-chm-6': { tier: 'tier1_heavy', weightagePercent: 12 }, // GOC
  'jee-chm-5': { tier: 'tier1_heavy', weightagePercent: 10 }, // Ionic & Chemical Equilibrium
  'jee-chm-3': { tier: 'tier1_heavy', weightagePercent: 10 }, // Chemical Bonding
  'jee-chm-4': { tier: 'tier2_core', weightagePercent: 8 },   // Thermodynamics
  'jee-chm-7': { tier: 'tier2_core', weightagePercent: 8 },   // Hydrocarbons
  'jee-chm-2': { tier: 'tier2_core', weightagePercent: 6 },   // Atomic Structure
  'jee-chm-1': { tier: 'tier3_foundational', weightagePercent: 5 }, // Mole Concept

  // JEE Mathematics
  'jee-mth-6': { tier: 'tier1_heavy', weightagePercent: 11 }, // Straight Lines & Circles
  'jee-mth-7': { tier: 'tier1_heavy', weightagePercent: 11 }, // Conic Sections
  'jee-mth-4': { tier: 'tier1_heavy', weightagePercent: 9 },  // Permutations & Combinations
  'jee-mth-2': { tier: 'tier2_core', weightagePercent: 8 },   // Quadratic Equations
  'jee-mth-3': { tier: 'tier2_core', weightagePercent: 7 },   // Sequences & Series
  'jee-mth-5': { tier: 'tier2_core', weightagePercent: 6 },   // Binomial Theorem
  'jee-mth-8': { tier: 'tier2_core', weightagePercent: 6 },   // Trigonometric Ratios
  'jee-mth-1': { tier: 'tier3_foundational', weightagePercent: 5 }, // Sets & Functions

  // College CS & AI/ML
  'cs-dsa-7': { tier: 'tier1_heavy', weightagePercent: 12 },  // DP 1D & Knapsack
  'cs-dsa-8': { tier: 'tier1_heavy', weightagePercent: 12 },  // DP 2D Grids & Strings
  'cs-dsa-6': { tier: 'tier1_heavy', weightagePercent: 11 },  // Graphs: Dijkstra & DSU
  'cs-dsa-5': { tier: 'tier2_core', weightagePercent: 8 },    // Graphs: BFS & DFS
  'cs-dsa-3': { tier: 'tier2_core', weightagePercent: 8 },    // Trees & BSTs
  'cs-dsa-2': { tier: 'tier2_core', weightagePercent: 7 },    // Binary Search
  'cs-dsa-4': { tier: 'tier2_core', weightagePercent: 6 },    // Heaps & Top-K
  'cs-dsa-1': { tier: 'tier3_foundational', weightagePercent: 6 }, // Arrays & Sliding Window
  'cs-ml-7': { tier: 'tier1_heavy', weightagePercent: 12 },   // Transformers & Self-Attention
  'cs-ml-6': { tier: 'tier1_heavy', weightagePercent: 10 },   // PyTorch Training Loops
  'cs-ml-5': { tier: 'tier2_core', weightagePercent: 8 },     // Neural Networks & Backprop
  'cs-ml-4': { tier: 'tier2_core', weightagePercent: 7 },     // Classic ML & Trees
  'cs-ml-2': { tier: 'tier2_core', weightagePercent: 7 },     // Probability & Bayes
  'cs-ml-1': { tier: 'tier3_foundational', weightagePercent: 6 }, // Linear Algebra & SVD
  'cs-ml-3': { tier: 'tier3_foundational', weightagePercent: 5 }, // NumPy Pipelines
  'cs-web-4': { tier: 'tier1_heavy', weightagePercent: 10 },  // Redis & Rate Limiting
  'cs-core-1': { tier: 'tier1_heavy', weightagePercent: 10 }, // OS Concurrency & Semaphores
};

import { LEGACY_CHAPTER_MAP } from '@/lib/curriculumData';

const REVERSE_LEGACY_MAP: Record<string, string> = Object.entries(LEGACY_CHAPTER_MAP).reduce((acc, [k, v]) => {
  acc[v] = k;
  return acc;
}, {} as Record<string, string>);

export function getChapterWeightage(chapterId: string): ChapterWeightageInfo {
  const direct = CHAPTER_WEIGHTAGES[chapterId];
  if (direct) return direct;
  const legacyKey = REVERSE_LEGACY_MAP[chapterId];
  if (legacyKey && CHAPTER_WEIGHTAGES[legacyKey]) return CHAPTER_WEIGHTAGES[legacyKey];
  return {
    tier: 'tier2_core',
    weightagePercent: 7,
  };
}

// ============================================================
// AGGREGATOR FUNCTION
// ============================================================

export async function getUnifiedAcademicState(
  userId: string = '',
  track: TrackType = 'jee_nsep'
): Promise<UnifiedStudentState> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = new Date();

  // 1. Fetch live Dexie records in parallel
  const [mistakes, exams, revisions, reflections, tasks] = await Promise.all([
    getLocalMistakes(userId),
    getLocalExams(userId),
    getLocalRevisions(userId),
    getRecentLocalReflections(userId, 7),
    (async () => {
      try {
        if (typeof window === 'undefined') return [];
        return await db.tasks.toArray();
      } catch {
        return [];
      }
    })(),
  ]);

  // 2. Aggregate Mistakes by Chapter
  const mistakeMap = new Map<string, ChapterMistakeStats>();
  let totalUnresolvedMistakes = 0;
  let conceptualMistakesCount = 0;

  for (const m of mistakes) {
    if (!mistakeMap.has(m.chapter_id)) {
      mistakeMap.set(m.chapter_id, {
        total: 0,
        unresolved: 0,
        conceptual: 0,
        calculation: 0,
        silly: 0,
        timePressure: 0,
        other: 0,
        hard: 0,
      });
    }

    const stat = mistakeMap.get(m.chapter_id)!;
    stat.total += 1;

    if (!m.resolved) {
      stat.unresolved += 1;
      totalUnresolvedMistakes += 1;

      if (m.difficulty === 'hard') stat.hard += 1;

      switch (m.mistake_type) {
        case 'conceptual':
        case 'logic_flaw':
          stat.conceptual += 1;
          conceptualMistakesCount += 1;
          break;
        case 'calculation':
          stat.calculation += 1;
          break;
        case 'silly':
        case 'misread_question':
          stat.silly += 1;
          break;
        case 'time_pressure':
        case 'tle':
          stat.timePressure += 1;
          break;
        default:
          stat.other += 1;
          break;
      }
    }
  }

  // Curriculum Chapters for live mapping and exam inference
  const baseChapters = getCurriculumChapters(track);

  // 3. Evaluate Nearest Upcoming Exam
  const upcomingExams = exams
    .filter((e) => e.exam_date >= todayStr)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date));

  let targetExam: TargetExamContext | null = null;
  const targetedChapterSet = new Set<string>();

  if (upcomingExams.length > 0) {
    const nextExam = upcomingExams[0];
    const examDateObj = parseISO(nextExam.exam_date);
    const daysRemaining = Math.max(0, differenceInCalendarDays(examDateObj, today));
    let inferredSubjectName: string | null = null;

    if (nextExam.chapter_ids && nextExam.chapter_ids.length > 0) {
      nextExam.chapter_ids.forEach((id) => targetedChapterSet.add(id));
      const firstTargeted = baseChapters.find((c) => nextExam.chapter_ids?.includes(c.id));
      if (firstTargeted) inferredSubjectName = firstTargeted.subjectName;
    } else {
      // Intelligently infer targeted chapters from exam title keywords (e.g. "COA midsem" -> "COA college subject")
      const stopWords = new Set(['exam', 'midsem', 'endsem', 'test', 'quiz', 'target', 'unit', 'final', 'mid', 'assessment', 'theory', 'lab', 'practical', 'sprint', 'session', 'mock', 'paper']);
      const examWords = nextExam.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !stopWords.has(w));

      const ACRONYMS: Record<string, string[]> = {
        coa: ['computer organization', 'architecture', 'coa', 'microprocessor', 'assembly', 'instruction set', 'cache', 'pipelining'],
        os: ['operating systems', 'operating system', 'os', 'concurrency', 'semaphores', 'memory management', 'scheduling', 'processes'],
        dbms: ['database', 'dbms', 'sql', 'b-trees', 'wal', 'postgres', 'relational'],
        cn: ['computer networks', 'networking', 'networks', 'tcp', 'dns', 'http', 'cn'],
        cd: ['compiler', 'compiler design', 'parsing', 'syntax', 'lexical', 'cd'],
        dsa: ['data structures', 'algorithms', 'dsa'],
        aiml: ['ai', 'machine learning', 'artificial intelligence', 'ml', 'neural networks'],
        ml: ['machine learning', 'ml', 'neural networks', 'linear algebra', 'pytorch'],
        ai: ['artificial intelligence', 'ai'],
        toc: ['theory of computation', 'automata', 'turing', 'computation'],
        se: ['software engineering'],
        oop: ['object oriented', 'oops', 'java', 'c++'],
      };

      const searchTerms = new Set<string>(examWords);
      examWords.forEach((w) => {
        if (ACRONYMS[w]) {
          ACRONYMS[w].forEach((syn) => searchTerms.add(syn));
        }
      });

      const termsList = Array.from(searchTerms);

      baseChapters.forEach((ch) => {
        const subLower = ch.subjectName.toLowerCase();
        const chapLower = ch.name.toLowerCase();
        const matches = termsList.some((w) => subLower.includes(w) || chapLower.includes(w));
        if (matches) {
          targetedChapterSet.add(ch.id);
          if (!inferredSubjectName) inferredSubjectName = ch.subjectName;
        }
      });

      if (!inferredSubjectName && examWords.length > 0) {
        const primary = examWords[0];
        inferredSubjectName = primary.length <= 4 ? primary.toUpperCase() : primary.charAt(0).toUpperCase() + primary.slice(1);
      }
    }

    targetExam = {
      id: nextExam.id,
      name: nextExam.name,
      examType: nextExam.exam_type,
      examDate: nextExam.exam_date,
      daysRemaining,
      isTargetingTrack: true,
      targetedChapterCount: targetedChapterSet.size,
      targetSubjectName: inferredSubjectName,
    };
  } else {
    // Sensible Olympiad / CS default countdown if no exam logged yet
    const fallbackDays = track === 'jee_nsep' ? 45 : 14;
    targetExam = {
      id: 'default-exam-target',
      name: track === 'jee_nsep' ? 'Target: NSEP / JEE Session 1' : 'Target: System & Algorithm Sprint',
      examType: track === 'jee_nsep' ? 'nsep' : 'college_contest',
      examDate: format(new Date(Date.now() + fallbackDays * 86400000), 'yyyy-MM-dd'),
      daysRemaining: fallbackDays,
      isTargetingTrack: true,
      targetedChapterCount: 0,
      targetSubjectName: track === 'jee_nsep' ? 'Physics' : 'Data Structures & Algorithms',
    };
  }

  // 4. Due Spaced Revisions
  const dueRevisionChapterSet = new Set<string>();
  revisions.forEach((r) => {
    if (r.due_date <= todayStr) {
      dueRevisionChapterSet.add(r.chapter_id);
    }
  });

  // 5. Evaluate Cognitive Profile & Fatigue Risk
  const latestReflection = reflections[0] || null;
  const reportedEnergy = latestReflection?.energy_rating ?? 4;
  const reportedSleep = latestReflection?.sleep_hours ?? 7.5;

  const validSleepEntries = reflections.map((r) => r.sleep_hours).filter((s): s is number => typeof s === 'number');
  const sevenDayAvgSleep =
    validSleepEntries.length > 0
      ? Math.round((validSleepEntries.reduce((a, b) => a + b, 0) / validSleepEntries.length) * 10) / 10
      : reportedSleep;

  // Recent Skip Reasons
  const recentTasks = tasks.filter((t) => t.status === 'skipped' && t.incomplete_reason);
  const recentSkipTrends: Record<string, number> = {};
  recentTasks.forEach((t) => {
    if (t.incomplete_reason) {
      recentSkipTrends[t.incomplete_reason] = (recentSkipTrends[t.incomplete_reason] || 0) + 1;
    }
  });

  const coachingOverrunCount = recentSkipTrends['coaching_overran'] || 0;
  const ranOutOfTimeCount = recentSkipTrends['ran_out_of_time'] || 0;
  const tooDifficultCount = recentSkipTrends['too_difficult'] || 0;

  // Fatigue risk calculation
  const fatigueRisk = reportedSleep < 6.0 || sevenDayAvgSleep < 6.2 || reportedEnergy <= 2;

  let energyMultiplier = 1.0;
  if (reportedEnergy === 1 || reportedSleep < 5.0) energyMultiplier = 0.6;
  else if (reportedEnergy === 2 || reportedSleep < 6.0) energyMultiplier = 0.75;
  else if (reportedEnergy === 3) energyMultiplier = 0.88;

  // Adaptive recommended study hours
  const baseCapacity = track === 'jee_nsep' ? 4.5 : 4.0;
  let recommendedStudyHours = Math.round(baseCapacity * energyMultiplier * 10) / 10;
  if (coachingOverrunCount >= 2) {
    recommendedStudyHours = Math.min(recommendedStudyHours, 3.2); // Protect evening sleep when coaching overruns
  }

  let overloadWarning: string | null = null;
  if (fatigueRisk) {
    overloadWarning = `Sleep deficit detected (${reportedSleep}h reported, 7-day avg: ${sevenDayAvgSleep}h). Orbit has scaled daily workload to prevent burnout.`;
  } else if (coachingOverrunCount >= 2) {
    overloadWarning = `Coaching overran ${coachingOverrunCount} times recently. Evening slots are restricted to high-yield active revision to protect recovery.`;
  }

  const cognitiveProfile: CognitiveCapacityProfile = {
    reportedEnergy,
    reportedSleep,
    sevenDayAvgSleep,
    energyMultiplier,
    recommendedStudyHours,
    fatigueRisk,
    overloadWarning,
    recentSkipTrends,
    latestBlockers: latestReflection?.blockers ?? null,
  };

  // 6. Map and Enrich Chapters with Live Dexie Data
  const overrides = getChapterOverrides();

  let masteredCount = 0;
  let practicingCount = 0;
  let learningCount = 0;
  let revisionDueCount = 0;
  let notStartedCount = 0;
  let confidenceSum = 0;

  const enrichedChapters: UnifiedChapterState[] = baseChapters.map((c) => {
    const override = overrides[c.id];
    let status = override?.status ?? c.status;
    let confidence = override?.confidence ?? c.confidence;

    // Check if revision is due in Dexie revisions
    const isRevisionDue = status === 'revision_due' || dueRevisionChapterSet.has(c.id);
    if (isRevisionDue && status !== 'revision_due') {
      status = 'revision_due';
    }

    // Mistake stats
    const mistakesStat = mistakeMap.get(c.id) ?? {
      total: 0,
      unresolved: c.unresolvedMistakes, // fallback to curriculum seed if no local mistakes logged yet
      conceptual: 0,
      calculation: 0,
      silly: 0,
      timePressure: 0,
      other: 0,
      hard: 0,
    };

    // Weightage
    const weightageInfo = getChapterWeightage(c.id);

    // Is targeted by upcoming exam?
    const isExamTargeted = targetedChapterSet.size > 0 && targetedChapterSet.has(c.id);

    // Dynamic Priority Formula (Expected Return per Study Hour)
    // 1. Conceptual mistake penalty (heavier weight)
    const mistakeWeight =
      Math.log(1 + mistakesStat.unresolved) * 2.0 +
      mistakesStat.conceptual * 1.5 +
      mistakesStat.hard * 1.0;

    // 2. Confidence gap
    const confidenceGap = ((100 - confidence) / 100) * 2.2;

    // 3. Spaced revision urgency
    const revisionBoost = isRevisionDue ? 3.5 : 0;

    // 4. Weightage tier multiplier: Tier 1 (1.4x), Tier 2 (1.1x), Tier 3 (0.85x)
    const tierMultiplier =
      weightageInfo.tier === 'tier1_heavy' ? 1.4 : weightageInfo.tier === 'tier2_core' ? 1.1 : 0.85;

    // 5. Exam proximity & targeting multiplier
    const examUrgency = targetExam
      ? isExamTargeted
        ? Math.max(1.8, 15 / Math.max(1, targetExam.daysRemaining))
        : targetedChapterSet.size > 0
        ? 0.5
        : 1.0
      : 1.0;

    const effectivePriorityScore = (mistakeWeight + confidenceGap + revisionBoost) * tierMultiplier * examUrgency;

    // Summary counts
    if (status === 'mastered') masteredCount += 1;
    else if (status === 'practicing') practicingCount += 1;
    else if (status === 'learning') learningCount += 1;
    else if (status === 'revision_due') revisionDueCount += 1;
    else notStartedCount += 1;

    confidenceSum += confidence;

    return {
      id: c.id,
      name: c.name,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      track: c.track,
      status,
      confidence,
      mistakes: mistakesStat,
      isRevisionDue,
      isExamTargeted,
      tier: weightageInfo.tier,
      weightagePercent: weightageInfo.weightagePercent,
      effectivePriorityScore,
    };
  });

  // Sort descending by effective priority score
  enrichedChapters.sort((a, b) => b.effectivePriorityScore - a.effectivePriorityScore);

  const averageConfidence =
    enrichedChapters.length > 0 ? Math.round(confidenceSum / enrichedChapters.length) : 60;

  return {
    userId,
    activeTrack: track,
    chapters: enrichedChapters,
    targetExam,
    cognitiveProfile,
    summary: {
      totalChapters: enrichedChapters.length,
      masteredCount,
      practicingCount,
      learningCount,
      revisionDueCount,
      notStartedCount,
      averageConfidence,
      totalUnresolvedMistakes,
      conceptualMistakesCount,
    },
  };
}
