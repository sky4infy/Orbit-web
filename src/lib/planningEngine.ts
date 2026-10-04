import type { TrackType, TimeSlot, EffortLevel } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';
import { getCurriculumChapters } from '@/lib/curriculumData';
import type { UnifiedStudentState, UnifiedChapterState } from '@/lib/academicState';

export interface PlanningEngineInput {
  userId: string;
  date: string;
  track: TrackType;
  availableHours?: number; // e.g. 4.0 or 6.5
  energyLevel?: number; // 1 to 5
  daysToKeyExam?: number; // e.g. 45 days to NSEP or 4 days to contest
  existingTasks: TaskWithChapter[];
  academicState?: UnifiedStudentState;
}

export interface SuggestedTask {
  title: string;
  slot: TimeSlot;
  effort: EffortLevel;
  estimatedMinutes: number;
  priority: number;
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  reason: string;
}

export interface PlanningEngineOutput {
  suggestedTasks: SuggestedTask[];
  totalPlannedMinutes: number;
  maxRecommendedMinutes: number;
  rationale: string;
  primaryFocus: string;
  overloadRisk: boolean;
  burnoutNotice?: string | null;
}

/**
 * Deterministic Planning Engine (Zero Hallucination).
 * Computes optimal task allocation based on live academic memory, exam proximity,
 * mistake taxonomy, and cognitive capacity constraints.
 */
export function generateOptimalDayPlan(input: PlanningEngineInput): PlanningEngineOutput {
  const isOlympiad = input.track === 'jee_nsep';
  const state = input.academicState;

  // 1. Determine Capacity & Energy Multiplier
  const cognitive = state?.cognitiveProfile;
  const energy = input.energyLevel ?? cognitive?.reportedEnergy ?? 4;
  const baseHours = input.availableHours ?? cognitive?.recommendedStudyHours ?? (isOlympiad ? 4.5 : 4.0);

  let energyMultiplier = cognitive?.energyMultiplier ?? (
    energy === 1 ? 0.6 : energy === 2 ? 0.75 : energy === 3 ? 0.88 : 1.0
  );

  const fatigueRisk = cognitive?.fatigueRisk ?? (energy <= 2);
  const maxRecommendedMinutes = Math.round(baseHours * 60 * energyMultiplier);

  // 2. Obtain Scored Chapter Pipeline
  let scoredCandidates: {
    id: string;
    name: string;
    subjectId: string;
    subjectName: string;
    status: string;
    confidence: number;
    score: number;
    unresolvedMistakes: number;
    conceptualMistakes: number;
    calculationMistakes: number;
    isRevisionDue: boolean;
    tier: string;
    weightagePercent: number;
  }[];

  if (state && state.chapters.length > 0) {
    // Live Academic Memory Pipeline
    scoredCandidates = state.chapters.map((c) => ({
      id: c.id,
      name: c.name,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      status: c.status,
      confidence: c.confidence,
      score: c.effectivePriorityScore,
      unresolvedMistakes: c.mistakes.unresolved,
      conceptualMistakes: c.mistakes.conceptual,
      calculationMistakes: c.mistakes.calculation,
      isRevisionDue: c.isRevisionDue,
      tier: c.tier,
      weightagePercent: c.weightagePercent,
    }));
  } else {
    // Fallback static calculation
    const chapters = getCurriculumChapters(input.track);
    scoredCandidates = chapters.map((c) => {
      const isRevisionDue = c.status === 'revision_due';
      const mistakeWeight = Math.log(1 + c.unresolvedMistakes) * 2.2;
      const confidenceGap = ((100 - c.confidence) / 100) * 1.8;
      const revisionBoost = isRevisionDue ? 3.0 : 0;
      const examUrgency = input.daysToKeyExam ? Math.max(0.5, 10 / Math.max(1, input.daysToKeyExam)) : 1.0;
      const totalScore = (mistakeWeight + confidenceGap + revisionBoost) * examUrgency;

      return {
        id: c.id,
        name: c.name,
        subjectId: c.subjectId,
        subjectName: c.subjectName,
        status: c.status,
        confidence: c.confidence,
        score: totalScore,
        unresolvedMistakes: c.unresolvedMistakes,
        conceptualMistakes: 0,
        calculationMistakes: 0,
        isRevisionDue,
        tier: 'tier2_core',
        weightagePercent: 7,
      };
    });
  }

  // Sort descending by priority score
  scoredCandidates.sort((a, b) => b.score - a.score);

  const topChapter = scoredCandidates[0];
  const suggestedTasks: SuggestedTask[] = [];
  let allocatedMinutes = 0;

  // Dynamic slot durations adjusted if fatigue risk is present
  const morningMinutes = fatigueRisk ? 40 : 50;
  const afternoonMinutes = fatigueRisk ? 35 : 40;
  const eveningMinutes = fatigueRisk ? 35 : 50;
  const nightMinutes = fatigueRisk ? 25 : 35;

  // Helper to formulate task title tailored to mistake taxonomy
  function getTaskDetails(c: typeof scoredCandidates[0], slot: TimeSlot) {
    if (c.conceptualMistakes > 0) {
      return {
        title: isOlympiad
          ? `${c.name}: First-Principles Concept Drill (${c.conceptualMistakes} conceptual errors)`
          : `${c.name}: Deep Dive & Invariant Proofs (${c.conceptualMistakes} core logic gaps)`,
        effort: (fatigueRisk ? 'medium' : 'high') as EffortLevel,
        reason: `Targeting ${c.conceptualMistakes} conceptual root errors logged in your Mistake Book.`,
      };
    }
    if (c.calculationMistakes > 0) {
      return {
        title: isOlympiad
          ? `${c.name}: 12 Timed Precision Problems (Clock Speed)`
          : `${c.name}: Implementation Speed Drill & Edge Case Handling`,
        effort: 'medium' as EffortLevel,
        reason: `Fixes ${c.calculationMistakes} calculation slips under simulated exam pressure.`,
      };
    }
    if (c.isRevisionDue) {
      return {
        title: isOlympiad
          ? `${c.name}: Spaced Revision Active Recall Drill`
          : `${c.name}: System & Pattern Spaced Review`,
        effort: 'medium' as EffortLevel,
        reason: 'Scheduled by spaced repetition to prevent forgetting curve decay.',
      };
    }
    if (c.tier === 'tier1_heavy') {
      return {
        title: isOlympiad
          ? `${c.name}: High-Yield PYQ Drill (Advanced Problems)`
          : `${c.name}: Architecture Sprint & Pattern Practice`,
        effort: (slot === 'night' ? 'low' : fatigueRisk ? 'medium' : 'high') as EffortLevel,
        reason: `Tier 1 high-yield chapter (~${c.weightagePercent}% exam weightage).`,
      };
    }
    return {
      title: isOlympiad
        ? `${c.name}: Multi-Concept Practice Set`
        : `${c.name}: Core Concepts & Problem Block`,
      effort: 'medium' as EffortLevel,
      reason: c.unresolvedMistakes > 0
        ? `Has ${c.unresolvedMistakes} unresolved errors to clear.`
        : 'Syllabus mastery progression.',
    };
  }

  // 1. Morning Slot: Peak Cognitive Focus
  if (topChapter && allocatedMinutes + morningMinutes <= maxRecommendedMinutes) {
    const details = getTaskDetails(topChapter, 'morning');
    suggestedTasks.push({
      title: details.title,
      slot: 'morning',
      effort: details.effort,
      estimatedMinutes: morningMinutes,
      priority: 1,
      chapterId: topChapter.id,
      chapterName: topChapter.name,
      subjectId: topChapter.subjectId,
      subjectName: topChapter.subjectName,
      reason: details.reason,
    });
    allocatedMinutes += morningMinutes;
  }

  // 2. Afternoon Slot: Cross-subject balance
  const secondSubject =
    scoredCandidates.find((c) => c.subjectId !== topChapter?.subjectId) ?? scoredCandidates[1];
  if (secondSubject && allocatedMinutes + afternoonMinutes <= maxRecommendedMinutes) {
    const details = getTaskDetails(secondSubject, 'afternoon');
    suggestedTasks.push({
      title: isOlympiad
        ? `${secondSubject.name}: Formula & Conceptual Derivations`
        : `${secondSubject.name}: Code Implementation Sprint`,
      slot: 'afternoon',
      effort: 'medium',
      estimatedMinutes: afternoonMinutes,
      priority: 2,
      chapterId: secondSubject.id,
      chapterName: secondSubject.name,
      subjectId: secondSubject.subjectId,
      subjectName: secondSubject.subjectName,
      reason: 'Cross-subject balance prevents cognitive saturation.',
    });
    allocatedMinutes += afternoonMinutes;
  }

  // 3. Evening Slot: Spaced Revision or Rigorous Problem Solving
  const revCandidate =
    scoredCandidates.find((c) => c.isRevisionDue && !suggestedTasks.some((t) => t.chapterId === c.id)) ??
    scoredCandidates[2];
  if (revCandidate && allocatedMinutes + eveningMinutes <= maxRecommendedMinutes) {
    const details = getTaskDetails(revCandidate, 'evening');
    suggestedTasks.push({
      title: revCandidate.isRevisionDue
        ? `${revCandidate.name}: Spaced Revision Active Recall`
        : details.title,
      slot: 'evening',
      effort: fatigueRisk ? 'medium' : 'high',
      estimatedMinutes: eveningMinutes,
      priority: 1,
      chapterId: revCandidate.id,
      chapterName: revCandidate.name,
      subjectId: revCandidate.subjectId,
      subjectName: revCandidate.subjectName,
      reason: revCandidate.isRevisionDue
        ? 'Scheduled by spaced repetition to prevent forgetting curve decay.'
        : details.reason,
    });
    allocatedMinutes += eveningMinutes;
  }

  // 4. Night Slot: Low friction consolidation / sleep protection
  const thirdSubject =
    scoredCandidates.find((c) => !suggestedTasks.some((t) => t.subjectId === c.subjectId)) ??
    scoredCandidates[3];
  if (thirdSubject && allocatedMinutes + nightMinutes <= maxRecommendedMinutes) {
    suggestedTasks.push({
      title: isOlympiad
        ? `${thirdSubject.name}: Quick Flashcard Revision & Error Review`
        : `${thirdSubject.name}: Code Review & Debugging Notes`,
      slot: 'night',
      effort: 'low',
      estimatedMinutes: nightMinutes,
      priority: 3,
      chapterId: thirdSubject.id,
      chapterName: thirdSubject.name,
      subjectId: thirdSubject.subjectId,
      subjectName: thirdSubject.subjectName,
      reason: 'Low cognitive friction to protect recovery and sleep quality.',
    });
    allocatedMinutes += nightMinutes;
  }

  let rationale = isOlympiad
    ? `STEM & Olympiad Strategy: Anchored on ${topChapter?.name ?? 'Physics'} during peak morning focus, balanced with active cross-subject problem solving in the evening, and light error review at night.`
    : `Computer Science & Systems Strategy: Front-loads core algorithmic patterns early, dedicates mid-day to architecture/PyTorch implementation, and reserves night for documentation and reflection.`;

  if (fatigueRisk) {
    rationale += ` 🛡️ Fatigue Protection Active: Workload calibrated down to ${Math.round(allocatedMinutes / 60 * 10) / 10}h based on recent sleep/energy trends.`;
  }

  return {
    suggestedTasks,
    totalPlannedMinutes: allocatedMinutes,
    maxRecommendedMinutes,
    rationale,
    primaryFocus: topChapter?.name ?? 'Core Concept Mastery',
    overloadRisk: allocatedMinutes > maxRecommendedMinutes,
    burnoutNotice: cognitive?.overloadWarning ?? (fatigueRisk ? 'Fatigue shield applied: slots shortened to protect sleep.' : null),
  };
}
