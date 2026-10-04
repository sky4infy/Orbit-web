export type ReviewGrade = 'failed' | 'hard' | 'good' | 'easy';

export interface IntervalCalculationParams {
  currentInterval: number;
  reviewCount: number;
  wasSuccessful: boolean;
  grade?: ReviewGrade;
  unresolvedMistakeCount?: number;
}

/**
 * Adaptive Spaced Repetition Algorithm (FSRS / SM-2 inspired).
 * Dynamically computes next interval in days based on review performance,
 * historical repetition depth, and mistake backlog friction.
 */
export function calculateAdaptiveInterval(params: IntervalCalculationParams): number {
  const { currentInterval, reviewCount, wasSuccessful, grade, unresolvedMistakeCount = 0 } = params;

  // 1. Handling Failed / Forgotten Assessment
  if (!wasSuccessful || grade === 'failed') {
    // If student previously had mastered this chapter (high review count),
    // give 2 days buffer for consolidation; otherwise reset to 1 day.
    return reviewCount >= 4 ? 2 : 1;
  }

  // 2. Base Multiplier by Performance Grade
  let multiplier = 2.0; // Default "Good"

  switch (grade) {
    case 'easy':
      multiplier = 2.6; // Confident & rapid active recall
      break;
    case 'hard':
      multiplier = 1.35; // Needed heavy thinking / friction
      break;
    case 'good':
    default:
      multiplier = 2.0; // Steady recall
      break;
  }

  // 3. Mistake Backlog Friction
  // If the chapter currently has unresolved errors in Mistake Book,
  // dampen interval acceleration so concepts don't decay before errors are cleared.
  if (unresolvedMistakeCount >= 3) {
    multiplier = Math.max(1.2, multiplier * 0.65);
  } else if (unresolvedMistakeCount > 0) {
    multiplier = Math.max(1.3, multiplier * 0.82);
  }

  // 4. Initial Step Calculations
  if (currentInterval <= 1) {
    return grade === 'easy' ? 4 : grade === 'hard' ? 2 : 3;
  }

  if (currentInterval <= 3) {
    return Math.round(currentInterval * multiplier);
  }

  // 5. Subsequent Growth with 90-day exam horizon cap
  const calculated = Math.round(currentInterval * multiplier);
  const nextInterval = Math.max(currentInterval + 1, calculated);
  return Math.min(90, nextInterval);
}

/**
 * Derives memory retention probability (0.0 to 1.0) given elapsed days
 * and current interval stability.
 * R(t) = exp(-t / S)
 */
export function estimateRetentionRate(daysElapsed: number, intervalDays: number): number {
  if (intervalDays <= 0) return 0.5;
  const stability = intervalDays * 1.2;
  const retention = Math.exp(-daysElapsed / stability);
  return Math.max(0.1, Math.min(1.0, Math.round(retention * 100) / 100));
}
