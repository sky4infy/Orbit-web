import type { TrackType, TimeSlot, EffortLevel } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';
import { getCurriculumChapters } from '@/lib/curriculumData';

export interface PlanningEngineInput {
  userId: string;
  date: string;
  track: TrackType;
  availableHours?: number; // e.g. 4.0 or 6.5
  energyLevel?: number; // 1 to 5
  daysToKeyExam?: number; // e.g. 45 days to NSEP or 4 days to contest
  existingTasks: TaskWithChapter[];
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
}

/**
 * Layer 2: Deterministic Planning Engine (Zero Hallucination).
 * Computes optimal task allocation based on academic memory, exam proximity,
 * mistake backlog, and energy constraints.
 */
export function generateOptimalDayPlan(input: PlanningEngineInput): PlanningEngineOutput {
  const energy = input.energyLevel ?? 4;
  const baseHours = input.availableHours ?? 4.5;
  // Energy multiplier: if drained (1-2), scale down capacity to prevent burnout
  const energyMultiplier = energy === 1 ? 0.6 : energy === 2 ? 0.75 : energy === 3 ? 0.9 : 1.0;
  const maxRecommendedMinutes = Math.round(baseHours * 60 * energyMultiplier);

  const chapters = getCurriculumChapters(input.track);

  // Score each chapter using the multi-factor Priority Formula
  const scored = chapters.map((c) => {
    const isRevisionDue = c.status === 'revision_due';
    const mistakeWeight = Math.log(1 + c.unresolvedMistakes) * 2.2;
    const confidenceGap = ((100 - c.confidence) / 100) * 1.8;
    const revisionBoost = isRevisionDue ? 3.0 : 0;
    const examUrgency = input.daysToKeyExam ? Math.max(0.5, 10 / Math.max(1, input.daysToKeyExam)) : 1.0;

    const totalScore = (mistakeWeight + confidenceGap + revisionBoost) * examUrgency;

    return {
      ...c,
      score: totalScore,
      isRevisionDue,
    };
  });

  // Sort descending by priority score
  scored.sort((a, b) => b.score - a.score);

  const isOlympiad = input.track === 'jee_nsep';
  const topChapter = scored[0];

  const suggestedTasks: SuggestedTask[] = [];
  let allocatedMinutes = 0;

  // 1. Morning Slot: High-leverage concept / hard problem set (Peak cognitive window)
  if (topChapter && allocatedMinutes + 50 <= maxRecommendedMinutes) {
    suggestedTasks.push({
      title: isOlympiad
        ? `${topChapter.name}: 12 Advanced Problems (Multi-Concept Drills)`
        : `${topChapter.name}: 2 Core Pattern Problems (Active Recall)`,
      slot: 'morning',
      effort: 'high',
      estimatedMinutes: 50,
      priority: 1,
      chapterId: topChapter.id,
      chapterName: topChapter.name,
      subjectId: topChapter.subjectId,
      subjectName: topChapter.subjectName,
      reason: topChapter.unresolvedMistakes > 0
        ? `Has ${topChapter.unresolvedMistakes} unresolved errors; needs fresh morning focus.`
        : 'High exam weightage concept.',
    });
    allocatedMinutes += 50;
  }

  // 2. Afternoon Slot: Secondary subject or theory consolidation
  const secondSubject = scored.find((c) => c.subjectId !== topChapter?.subjectId) ?? scored[1];
  if (secondSubject && allocatedMinutes + 40 <= maxRecommendedMinutes) {
    suggestedTasks.push({
      title: isOlympiad
        ? `${secondSubject.name}: Formula & Conceptual Boundary Derivations`
        : `${secondSubject.name}: Implementation & Architecture Sprint`,
      slot: 'afternoon',
      effort: 'medium',
      estimatedMinutes: 40,
      priority: 2,
      chapterId: secondSubject.id,
      chapterName: secondSubject.name,
      subjectId: secondSubject.subjectId,
      subjectName: secondSubject.subjectName,
      reason: 'Cross-subject balance prevents cognitive saturation.',
    });
    allocatedMinutes += 40;
  }

  // 3. Evening Slot: Spaced Revision or Challenging Problem Block
  const revCandidate = scored.find((c) => c.isRevisionDue && !suggestedTasks.some((t) => t.chapterId === c.id)) ?? scored[2];
  if (revCandidate && allocatedMinutes + 50 <= maxRecommendedMinutes) {
    suggestedTasks.push({
      title: isOlympiad
        ? `${revCandidate.name}: Timed Exam Question Drill (High Rigor)`
        : `${revCandidate.name}: Deep Work Block & Edge Case Testing`,
      slot: 'evening',
      effort: 'high',
      estimatedMinutes: 50,
      priority: 1,
      chapterId: revCandidate.id,
      chapterName: revCandidate.name,
      subjectId: revCandidate.subjectId,
      subjectName: revCandidate.subjectName,
      reason: revCandidate.isRevisionDue
        ? 'Scheduled by spaced repetition to prevent forgetting curve decay.'
        : 'Deep focus slot before evening fatigue sets in.',
    });
    allocatedMinutes += 50;
  }

  // 4. Night Slot: Low cognitive friction, review or quick summary (No heavy stress before bed)
  const thirdSubject = scored.find((c) => !suggestedTasks.some((t) => t.subjectId === c.subjectId)) ?? scored[3];
  if (thirdSubject && allocatedMinutes + 35 <= maxRecommendedMinutes) {
    suggestedTasks.push({
      title: isOlympiad
        ? `${thirdSubject.name}: Quick Flashcard Revision & PYQ Check`
        : `${thirdSubject.name}: Code Review & Debugging Documentation`,
      slot: 'night',
      effort: 'low',
      estimatedMinutes: 35,
      priority: 3,
      chapterId: thirdSubject.id,
      chapterName: thirdSubject.name,
      subjectId: thirdSubject.subjectId,
      subjectName: thirdSubject.subjectName,
      reason: 'Low cognitive friction to protect sleep quality.',
    });
    allocatedMinutes += 35;
  }

  const rationale = isOlympiad
    ? `STEM & Olympiad Strategy: Anchored on ${topChapter?.name ?? 'Physics'} while morning cognitive energy is highest, scheduling active spaced revision in the evening, and keeping night review low-friction to protect sleep.`
    : `Computer Science & Systems Strategy: Front-loads algorithm pattern recall early, gives an uninterrupted mid-day implementation block for PyTorch/Systems, and reserves night for documentation and reflection.`;

  return {
    suggestedTasks,
    totalPlannedMinutes: allocatedMinutes,
    maxRecommendedMinutes,
    rationale,
    primaryFocus: topChapter?.name ?? 'Core Concept Mastery',
    overloadRisk: allocatedMinutes > maxRecommendedMinutes,
  };
}
